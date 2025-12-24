#!/usr/bin/env node
/**
 * Simple migration runner
 * Usage: node scripts/simple-migrate.js [migration-file] [--verbose]
 * 
 * Options:
 *   --verbose    Print SQL output (sanitized) to stdout
 * 
 * This script executes SQL migrations safely, handling:
 * - Multi-statement SQL files
 * - Semicolons in strings, dollar-quoted blocks, and function bodies
 * - Proper error reporting with file name and statement index
 */

const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const sqlTemplate = require('@databases/sql');
const splitSqlQuery = require('@databases/split-sql-query');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '../.env.local');
let envContent;
try {
    envContent = fs.readFileSync(envPath, 'utf8');
} catch (error) {
    console.error('❌ Missing .env.local: please create one at project root');
    console.error(`   Expected location: ${envPath}`);
    console.error(`   Original error: ${error.message}`);
    process.exit(1);
}

const envVars = {};

envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        // Handle quoted values: remove outer quotes and unescape inner quotes
        if (value.length >= 2) {
            const firstChar = value[0];
            const lastChar = value[value.length - 1];
            
            // Check if value is wrapped in matching quotes
            if ((firstChar === '"' && lastChar === '"') || (firstChar === "'" && lastChar === "'")) {
                // Remove outer quotes
                value = value.slice(1, -1);
                // Unescape escaped quotes and backslashes
                if (firstChar === '"') {
                    // Unescape double quotes and backslashes in double-quoted strings
                    value = value.replace(/\\(["\\])/g, '$1');
                } else {
                    // Unescape single quotes and backslashes in single-quoted strings
                    value = value.replace(/\\(['\\])/g, '$1');
                }
            }
        }
        
        envVars[key] = value;
    }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = envVars.DATABASE_URL;

// Parse CLI arguments
const args = process.argv.slice(2);
const verboseIndex = args.findIndex(arg => arg === '--verbose' || arg === '-v');
const isVerbose = verboseIndex !== -1;
const migrationFileArg = args.find(arg => arg !== '--verbose' && arg !== '-v' && !arg.startsWith('-'));

if (!migrationFileArg) {
    console.error('❌ Please provide a migration file path');
    console.error('Usage: node scripts/simple-migrate.js supabase/migrations/FILENAME.sql [--verbose]');
    console.error('');
    console.error('Options:');
    console.error('  --verbose, -v    Print SQL output (sanitized) to stdout');
    process.exit(1);
}

const migrationFile = migrationFileArg;

const migrationPath = path.join(__dirname, '..', migrationFile);
if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
}

const sql = fs.readFileSync(migrationPath, 'utf8');
const migrationFileName = path.basename(migrationFile);

/**
 * Sanitize SQL by redacting sensitive patterns
 * Masks emails, UUIDs, API keys/tokens, and common credential patterns
 */
function sanitizeSql(sqlText) {
    let sanitized = sqlText;
    
    // Redact email addresses
    sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');
    
    // Redact UUIDs (v4 format)
    sanitized = sanitized.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[REDACTED_UUID]');
    
    // Redact connection strings (postgres://, postgresql://) - do this before other patterns
    sanitized = sanitized.replace(/(postgres(ql)?:\/\/[^:]+:)[^@]+(@[^\s'"]+)/gi, 
        '$1[REDACTED_PASSWORD]$2');
    
    // Redact common credential patterns in SQL (password, secret, key, token fields)
    sanitized = sanitized.replace(/(password|secret|api[_-]?key|token|auth[_-]?token|access[_-]?token)\s*=\s*['"]?([^'";\s]{16,})['"]?/gi, 
        (match, field, value) => `${field} = '[REDACTED_CREDENTIAL]'`);
    
    // Redact API keys and tokens (long base64/hex-like strings in VALUES or string contexts)
    // Only match patterns that look like keys/tokens: base64-like (with = padding) or long hex strings
    sanitized = sanitized.replace(/(['"])([A-Za-z0-9+/]{40,}={0,2})(['"])/g, (match, quote1, value, quote2) => {
        // Check if it looks like base64 (may end with = or ==, alphanumeric + / + =)
        if (/^[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length >= 40) {
            return `${quote1}[REDACTED_TOKEN]${quote2}`;
        }
        return match;
    });
    
    // Redact long hex strings (32+ hex chars) that appear to be keys/tokens
    sanitized = sanitized.replace(/(['"])([0-9a-f]{32,})(['"])/gi, (match, quote1, value, quote2) => {
        // Only redact if it's a reasonable length for a key/token (not extremely long)
        if (value.length >= 32 && value.length <= 128) {
            return `${quote1}[REDACTED_TOKEN]${quote2}`;
        }
        return match;
    });
    
    return sanitized;
}

console.log('🚀 Running migration:', migrationFileName);

if (isVerbose) {
    console.log('\n📝 SQL to execute (sanitized):');
    console.log('─'.repeat(60));
    console.log(sanitizeSql(sql));
    console.log('─'.repeat(60));
}

async function runMigrationWithPg() {
    // Method 1: Use pg client directly (best option - supports multi-statement execution)
    if (!databaseUrl) {
        return false; // Fall back to Supabase RPC method
    }

    console.log('\n🔌 Using direct PostgreSQL connection (DATABASE_URL)...\n');

    const isProduction = envVars.NODE_ENV === 'production';
    const sslRejectUnauthorized = envVars.DATABASE_SSL_REJECT_UNAUTHORIZED !== undefined
        ? envVars.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
        : isProduction;

    const sslConfig = { rejectUnauthorized: sslRejectUnauthorized };

    // Load CA certificate if provided
    if (envVars.DATABASE_SSL_CA_PATH) {
        try {
            const caCert = fs.readFileSync(envVars.DATABASE_SSL_CA_PATH, 'utf8');
            sslConfig.ca = caCert;
            console.log(`📜 Loaded CA certificate from: ${envVars.DATABASE_SSL_CA_PATH}`);
        } catch (err) {
            console.error(`❌ Failed to load CA certificate: ${err.message}`);
            return false;
        }
    }

    const client = new Client({
        connectionString: databaseUrl,
        ssl: sslConfig
    });

    try {
        await client.connect();
        console.log('✅ Connected to database');

        // Execute the full SQL in one call (PostgreSQL supports multi-statement execution)
        console.log('\n🔄 Executing migration SQL...\n');
        await client.query(sql);

        console.log('\n✅ Migration completed successfully!');
        return true;
    } catch (error) {
        console.error(`\n❌ Migration failed for file: ${migrationFileName}`);
        console.error(`   Error: ${error.message}`);
        if (error.position) {
            console.error(`   Position: ${error.position}`);
        }
        console.error(`   Full error:`, JSON.stringify(error, null, 2));
        console.error('\n⚠️  Migration failed. Please fix the SQL and try again.\n');
        throw error;
    } finally {
        await client.end();
    }
}

async function runMigrationWithSupabase() {
    // Method 2: Use Supabase RPC with SQL-aware statement splitting
    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase credentials in .env.local');
        console.error('   Need either DATABASE_URL or NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
        process.exit(1);
    }

    console.log('\n🔌 Using Supabase RPC with SQL-aware statement splitting...\n');

    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false
        }
    });

    try {
        // Use SQL-aware parser to split statements safely
        // This handles semicolons in strings, dollar-quoted blocks, and function bodies
        // Pass raw SQL string directly to splitSqlQuery (it accepts strings)
        // Using sqlTemplate would parameterize the entire SQL as a single value, preventing proper parsing
        const queryObjects = splitSqlQuery(sql);
        const statements = queryObjects
            .map(q => {
                // If q is already a string, use it directly; otherwise format it
                const sqlText = typeof q === 'string' ? q : q.format({ placeholder: '?' }).text;
                return sqlText.trim();
            })
            .filter(s => s && !s.startsWith('--'));

        if (statements.length === 0) {
            console.log('⚠️  No SQL statements found in file');
            return;
        }

        console.log(`🔄 Executing ${statements.length} SQL statement(s)...\n`);

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            const statementIndex = i + 1;
            const preview = stmt.substring(0, 60).replace(/\n/g, ' ');

            console.log(`[${statementIndex}/${statements.length}] Executing: ${preview}...`);

            // Use raw SQL execution via RPC
            const { data, error } = await supabase.rpc('exec_sql', {
                sql_query: stmt + (stmt.trim().endsWith(';') ? '' : ';')
            });

            if (error) {
                // Check if this is an RPC-not-found error using error codes
                // PGRST202: PostgREST-specific error when function is not found in schema cache
                // 42883: PostgreSQL undefined_function error code
                const errorMessage = error.message || String(error);
                const isRpcNotFound = 
                    error.code === 'PGRST202' || // PostgREST: function not found in schema cache
                    error.code === '42883';      // PostgreSQL: undefined_function

                if (isRpcNotFound) {
                    console.error(`\n❌ CRITICAL: The exec_sql RPC function is not available in your Supabase instance.`);
                    console.error(`\n📋 Migration file: ${migrationFileName}`);
                    console.error(`   Statement index: ${statementIndex}/${statements.length}`);
                    console.error(`\n📋 Full error details:`);
                    console.error(JSON.stringify(error, null, 2));
                    console.error(`\n🔧 Action required:`);
                    console.error(`   The exec_sql RPC function must be created in your Supabase database.`);
                    console.error(`   You have two options:`);
                    console.error(`\n   1. Use Supabase CLI (recommended):`);
                    console.error(`      supabase db push`);
                    console.error(`      # or`);
                    console.error(`      supabase migration up`);
                    console.error(`\n   2. Run SQL manually in Supabase Dashboard:`);
                    console.error(`      - Go to: https://supabase.com/dashboard → SQL Editor`);
                    console.error(`      - Copy the SQL from above and execute it there`);
                    console.error(`\n⚠️  Migration was NOT applied. Please use one of the methods above.\n`);
                    process.exit(1);
                } else {
                    // Other SQL execution errors (syntax, permissions, etc.)
                    console.error(`\n❌ SQL execution failed:`);
                    console.error(`   Migration file: ${migrationFileName}`);
                    console.error(`   Statement index: ${statementIndex}/${statements.length}`);
                    console.error(`   Statement preview: ${preview}...`);
                    console.error(`   Error: ${errorMessage}`);
                    console.error(`   Full error:`, JSON.stringify(error, null, 2));
                    console.error(`\n⚠️  Migration failed. Please fix the SQL and try again.\n`);
                    process.exit(1);
                }
            } else {
                console.log(`✅ Success`);
            }
        }

        console.log('\n✅ Migration completed successfully!');
    } catch (error) {
        console.error(`\n❌ Error executing migration: ${migrationFileName}`);
        console.error(`   Error: ${error.message}`);
        console.error(`   Full error:`, JSON.stringify(error, null, 2));
        throw error;
    }
}

async function runMigration() {
    try {
        // Explicit env-based branching: use DATABASE_URL if set, otherwise use Supabase RPC
        if (databaseUrl) {
            // Use pg client directly - let errors bubble up to outer catch
            await runMigrationWithPg();
        } else {
            // Fall back to Supabase RPC with SQL-aware splitting
            await runMigrationWithSupabase();
        }
    } catch (error) {
        console.error(`\n❌ Migration failed for file: ${migrationFileName}`);
        console.error(`   Error: ${error.message}`);
        process.exit(1);
    }
}

runMigration();
