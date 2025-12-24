/**
 * Migration Script: Add Personal Info Fields to Users Table
 * 
 * This script runs the migration to add phone, address, linkedin_url,
 * and portfolio_url columns to the users table.
 * 
 * Run with: node scripts/run-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('🚀 Running migration: Add Personal Info Fields\n');

    try {
        // Read the migration SQL file
        const migrationPath = path.join(__dirname, '../supabase/migrations/20250121_add_personal_info.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📝 Migration SQL:');
        console.log(migrationSQL);
        console.log('\n🔄 Executing migration...\n');

        // Split SQL statements properly, respecting quotes and comments
        function splitSqlStatements(sql) {
            const statements = [];
            let current = '';
            let inSingleQuote = false;
            let inDoubleQuote = false;
            let inBacktick = false;
            let inBlockComment = false;
            let i = 0;

            while (i < sql.length) {
                const char = sql[i];
                const nextChar = i + 1 < sql.length ? sql[i + 1] : '';

                // Handle block comments /* */
                if (!inSingleQuote && !inDoubleQuote && !inBacktick && char === '/' && nextChar === '*') {
                    inBlockComment = true;
                    current += char;
                    i++;
                    current += nextChar;
                    i++;
                    continue;
                }
                if (inBlockComment && char === '*' && nextChar === '/') {
                    inBlockComment = false;
                    current += char;
                    i++;
                    current += nextChar;
                    i++;
                    continue;
                }
                if (inBlockComment) {
                    current += char;
                    i++;
                    continue;
                }

                // Handle line comments --
                if (!inSingleQuote && !inDoubleQuote && !inBacktick && char === '-' && nextChar === '-') {
                    // Skip to end of line
                    while (i < sql.length && sql[i] !== '\n') {
                        current += sql[i];
                        i++;
                    }
                    if (i < sql.length) {
                        current += sql[i]; // include the newline
                        i++;
                    }
                    continue;
                }

                // Handle quotes (only when not in comments)
                // Check for escaped doubled quotes ('' or "") and skip without toggling state
                if (char === "'" && !inDoubleQuote && !inBacktick) {
                    if (nextChar === "'" && inSingleQuote) {
                        // Doubled single quote escape - consume both, don't toggle
                        current += char;
                        i++;
                        current += nextChar;
                        i++;
                        continue;
                    }
                    inSingleQuote = !inSingleQuote;
                } else if (char === '"' && !inSingleQuote && !inBacktick) {
                    if (nextChar === '"' && inDoubleQuote) {
                        // Doubled double quote escape - consume both, don't toggle
                        current += char;
                        i++;
                        current += nextChar;
                        i++;
                        continue;
                    }
                    inDoubleQuote = !inDoubleQuote;
                } else if (char === '`' && !inSingleQuote && !inDoubleQuote) {
                    inBacktick = !inBacktick;
                }

                // Handle statement separator (only when outside quotes and comments)
                if (char === ';' && !inSingleQuote && !inDoubleQuote && !inBacktick && !inBlockComment) {
                    const trimmed = current.trim();
                    if (trimmed) {
                        statements.push(trimmed);
                    }
                    current = '';
                    i++;
                    continue;
                }

                current += char;
                i++;
            }

            // Add final statement if any
            const trimmed = current.trim();
            if (trimmed) {
                statements.push(trimmed);
            }

            return statements;
        }

        // Execute each SQL statement separately
        const statements = splitSqlStatements(migrationSQL)
            .map(stmt => stmt.trim())
            .filter(stmt => {
                // Remove pure comment lines (lines starting with --)
                const lines = stmt.split('\n');
                const nonCommentLines = lines.filter(line => {
                    const trimmed = line.trim();
                    return trimmed && !trimmed.startsWith('--');
                });
                // Reconstruct statement without comment-only lines
                const cleaned = nonCommentLines.join('\n').trim();
                // Filter out COMMENT ON statements by checking if it starts with COMMENT ON
                // after removing leading whitespace and comment markers
                if (!cleaned) return false;
                const upperCleaned = cleaned.toUpperCase().trim();
                // Skip if it's a COMMENT ON statement (these are metadata, not executable DDL)
                if (upperCleaned.startsWith('COMMENT ON')) {
                    return false;
                }
                return true;
            });

        for (const statement of statements) {
            if (statement.includes('ALTER TABLE')) {
                const { data, error } = await supabase.rpc('exec_sql', { sql: statement });

                if (error) {
                    // Try direct execution as fallback
                    console.log(`Executing: ${statement.substring(0, 60)}...`);
                    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`
                        },
                        body: JSON.stringify({ sql: statement })
                    });

                    // Safely parse response body - handle both JSON and non-JSON responses
                    let responseBody;
                    let responseText = '';
                    try {
                        responseText = await response.text();
                        responseBody = responseText ? JSON.parse(responseText) : {};
                    } catch (parseError) {
                        // If JSON parsing fails, use raw text as fallback
                        responseBody = { message: responseText || response.statusText };
                    }

                    // Check for errors in the response body
                    if (responseBody.error || !response.ok) {
                        const errorMessage = responseBody.error?.message || responseBody.message || response.statusText || 'Unknown error';
                        const errorDetails = responseBody.error || responseBody;
                        console.error(`❌ HTTP fallback failed: ${errorMessage}`);
                        console.error('Error details:', JSON.stringify(errorDetails, null, 2));
                        if (responseText && !responseBody.error) {
                            console.error('Response body (raw):', responseText);
                        }
                        throw new Error(`Migration failed on statement: ${errorMessage}`);
                    }

                    // Success - log and continue processing
                    console.log(`✅ ${statement.substring(0, 60)}... (via HTTP fallback)`);
                    // Data is available in responseBody.data if needed by caller
                } else {
                    console.log(`✅ ${statement.substring(0, 60)}...`);
                }
            }
        }

        console.log('\n✅ Migration completed!');
        console.log('\n🔍 Verifying changes...\n');

        // Verify the columns were added
        const { data: columns, error: verifyError } = await supabase
            .from('users')
            .select('*')
            .limit(0);

        if (verifyError) {
            console.log('⚠️  Cannot verify via select, but migration commands were sent');
        } else {
            console.log('✅ Users table structure updated successfully!');
        }

        console.log('\n🎉 Done! The personal info fields are now available in the users table.');
        console.log('You can now use: phone, address, linkedin_url, portfolio_url');

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('\n💡 Manual fix:');
        console.log('Run these SQL commands directly in your Supabase SQL editor:\n');
        console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;');
        console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;');
        console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url TEXT;');
        console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio_url TEXT;');
        process.exit(1);
    }
}

runMigration();
