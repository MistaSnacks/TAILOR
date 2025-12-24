-- =============================================================================
-- TAILOR TEST PROFILES SEED DATA
-- =============================================================================
-- This script creates 5 test user profiles with enriched work histories 
-- to test how the model selects content for different role types.
--
-- Profiles:
--   1. Principal Engineer (15+ years tech experience)
--   2. Retail/Customer Service Worker (entry-level/service industry)
--   3. Teacher Transitioning to Tech (career changer)
--   4. Warehouse Associate/Forklift Operator (logistics/operations)
--   5. Government Employee (federal resume style)
--
-- HOW TO USE:
--   1. Run this SQL in Supabase SQL Editor (Dashboard > SQL Editor)
--   2. Or use: psql -h <your-supabase-host> -d postgres -U postgres -f seed-test-profiles.sql
--   3. After seeding, run the ingestion API to populate canonical tables
--
-- TO ACCESS TEST PROFILES:
--   - Log in with test email (e.g., principal.engineer@test.tailor.dev)
--   - Or query: SELECT * FROM users WHERE email LIKE '%@test.tailor.dev';
-- =============================================================================

-- Clean up any existing test data first
DELETE FROM users WHERE email LIKE '%@test.tailor.dev';

-- =============================================================================
-- PROFILE 1: PRINCIPAL ENGINEER
-- A senior tech leader with 15+ years of experience
-- =============================================================================
DO $$
DECLARE
    user_id_pe UUID := uuid_generate_v4();
    doc_id_1 UUID := uuid_generate_v4();
    doc_id_2 UUID := uuid_generate_v4();
    doc_id_3 UUID := uuid_generate_v4();
    doc_id_4 UUID := uuid_generate_v4();
    doc_id_5 UUID := uuid_generate_v4();
    doc_id_6 UUID := uuid_generate_v4();
BEGIN
    -- Create user
    INSERT INTO users (id, name, email, created_at) VALUES
    (user_id_pe, 'Marcus Chen', 'principal.engineer@test.tailor.dev', NOW());

    -- Create profile
    INSERT INTO profiles (user_id, email, full_name, phone_number, linkedin_url, portfolio_url) VALUES
    (user_id_pe, 'principal.engineer@test.tailor.dev', 'Marcus Chen', '(415) 555-0101', 
     'https://www.linkedin.com/in/marcuschen', 'https://marcuschen.dev');

    -- Document 1: Master Resume
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_1, user_id_pe, 'marcus_chen_resume_2024.pdf', 'application/pdf', 125000, 'test/marcus_chen_resume_2024.pdf', 'resume', 'completed', 
    '{
        "contactInfo": {
            "name": "Marcus Chen",
            "email": "marcus.chen@email.com",
            "phone": "(415) 555-0101",
            "linkedin": "linkedin.com/in/marcuschen",
            "portfolio": "marcuschen.dev",
            "location": "San Francisco, CA"
        },
        "summary": "Principal Software Engineer with 15+ years of experience architecting distributed systems at scale. Expert in cloud-native technologies, microservices, and leading high-performing engineering teams. Proven track record of delivering mission-critical systems handling millions of daily transactions.",
        "experiences": [
            {
                "company": "Stripe",
                "title": "Principal Engineer",
                "location": "San Francisco, CA",
                "startDate": "2021-03",
                "endDate": "Present",
                "isCurrent": true,
                "bullets": [
                    "Led architecture redesign of payment processing pipeline, reducing latency by 40% and improving throughput to 50,000 TPS",
                    "Architected multi-region disaster recovery system achieving 99.999% uptime across global infrastructure",
                    "Mentored 12 senior engineers and established technical standards adopted across 8 engineering teams",
                    "Designed and implemented real-time fraud detection system processing $2B+ in daily transactions",
                    "Drove adoption of event-driven architecture patterns, reducing system coupling and deployment failures by 65%"
                ]
            },
            {
                "company": "Google",
                "title": "Staff Software Engineer",
                "location": "Mountain View, CA",
                "startDate": "2016-06",
                "endDate": "2021-02",
                "isCurrent": false,
                "bullets": [
                    "Designed and built core infrastructure for Google Cloud Pub/Sub, serving 10,000+ enterprise customers",
                    "Led team of 8 engineers developing distributed message queuing system handling 5 billion messages/day",
                    "Implemented automatic scaling algorithms reducing infrastructure costs by $4M annually",
                    "Authored internal design documents that became reference architectures for 50+ teams",
                    "Received Founders Award for technical leadership on critical reliability improvements"
                ]
            },
            {
                "company": "Amazon Web Services",
                "title": "Senior Software Engineer",
                "location": "Seattle, WA",
                "startDate": "2012-01",
                "endDate": "2016-05",
                "isCurrent": false,
                "bullets": [
                    "Built core components of AWS Lambda, one of the most successful serverless computing platforms",
                    "Developed container orchestration system managing 100,000+ concurrent function executions",
                    "Designed API gateway integration handling 1M+ API calls per second",
                    "Implemented cold start optimization reducing function initialization time by 70%",
                    "Filed 5 patents for serverless computing innovations"
                ]
            }
        ],
        "education": [
            {
                "institution": "Stanford University",
                "degree": "Master of Science",
                "field": "Computer Science",
                "startDate": "2008",
                "endDate": "2010",
                "gpa": "3.9",
                "honors": ["Specialization in Distributed Systems"]
            },
            {
                "institution": "UC Berkeley",
                "degree": "Bachelor of Science",
                "field": "Electrical Engineering and Computer Science",
                "startDate": "2004",
                "endDate": "2008",
                "gpa": "3.8",
                "honors": ["Cum Laude", "Regents Scholar"]
            }
        ],
        "certifications": [
            {"name": "AWS Solutions Architect Professional", "issuer": "Amazon Web Services", "date": "2023-01"},
            {"name": "Google Cloud Professional Cloud Architect", "issuer": "Google Cloud", "date": "2022-06"},
            {"name": "Kubernetes Administrator (CKA)", "issuer": "CNCF", "date": "2021-09"}
        ],
        "skills": ["Go", "Rust", "Python", "Java", "Kubernetes", "AWS", "GCP", "Terraform", "Distributed Systems", "Microservices", "System Design", "Technical Leadership", "gRPC", "Kafka", "PostgreSQL", "Redis", "Docker", "CI/CD", "Observability", "SRE Practices"]
    }'::jsonb, NOW());

    -- Document 2: Earlier Resume Version (different bullet emphasis)
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_2, user_id_pe, 'marcus_resume_v2.pdf', 'application/pdf', 98000, 'test/marcus_resume_v2.pdf', 'resume', 'completed', 
    '{
        "contactInfo": {"name": "Marcus Chen", "email": "marcus.chen@email.com", "phone": "(415) 555-0101"},
        "summary": "Senior software architect specializing in large-scale distributed systems and cloud infrastructure.",
        "experiences": [
            {
                "company": "Stripe",
                "title": "Principal Engineer",
                "location": "San Francisco, CA",
                "startDate": "2021-03",
                "endDate": "Present",
                "isCurrent": true,
                "bullets": [
                    "Spearheaded migration from monolithic architecture to microservices, enabling independent team deployments",
                    "Established engineering excellence program resulting in 30% reduction in production incidents",
                    "Created internal platform team reducing developer onboarding time from 2 weeks to 3 days"
                ]
            },
            {
                "company": "Google",
                "title": "Staff Software Engineer",
                "location": "Mountain View, CA",
                "startDate": "2016-06",
                "endDate": "2021-02",
                "isCurrent": false,
                "bullets": [
                    "Pioneered use of machine learning for capacity planning, improving resource utilization by 25%",
                    "Led cross-functional initiative integrating Pub/Sub with BigQuery, enabling real-time analytics for enterprise customers"
                ]
            }
        ],
        "skills": ["System Architecture", "Team Leadership", "Agile", "Code Review", "Performance Optimization"]
    }'::jsonb, NOW() - INTERVAL '6 months');

    -- Document 3: Tech Blog/Writing Sample
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_3, user_id_pe, 'technical_blog_posts.pdf', 'application/pdf', 45000, 'test/technical_blog_posts.pdf', 'resume', 'completed',
    '{
        "summary": "Collection of published technical articles and conference presentations.",
        "experiences": [
            {
                "company": "Stripe Engineering Blog",
                "title": "Technical Author",
                "startDate": "2022",
                "endDate": "Present",
                "isCurrent": true,
                "bullets": [
                    "Published Building Resilient Payment Systems article with 50K+ views and 500+ social shares",
                    "Presented at Strange Loop 2023 on Evolving Distributed Systems Architecture to 1,200 attendees"
                ]
            }
        ],
        "skills": ["Technical Writing", "Public Speaking", "Knowledge Sharing"]
    }'::jsonb, NOW() - INTERVAL '3 months');

    -- Document 4: Open Source Contributions
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_4, user_id_pe, 'open_source_contributions.pdf', 'application/pdf', 32000, 'test/open_source_contributions.pdf', 'resume', 'completed',
    '{
        "experiences": [
            {
                "company": "Kubernetes (CNCF)",
                "title": "Core Contributor",
                "startDate": "2019",
                "endDate": "Present",
                "isCurrent": true,
                "bullets": [
                    "Contributed 40+ PRs to Kubernetes scheduler improving pod placement efficiency by 15%",
                    "Authored KEP (Kubernetes Enhancement Proposal) for improved resource quota management",
                    "Serve as reviewer for scheduler and autoscaling SIG"
                ]
            },
            {
                "company": "OpenTelemetry",
                "title": "Maintainer",
                "startDate": "2020",
                "endDate": "Present",
                "isCurrent": true,
                "bullets": [
                    "Maintain Go SDK with 2M+ weekly downloads",
                    "Designed trace context propagation specification adopted as W3C standard"
                ]
            }
        ],
        "skills": ["Open Source", "Community Building", "Standards Development"]
    }'::jsonb, NOW() - INTERVAL '1 month');

    -- Document 5: Performance Review Highlights (self-summary)
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_5, user_id_pe, 'performance_highlights.pdf', 'application/pdf', 28000, 'test/performance_highlights.pdf', 'resume', 'completed',
    '{
        "experiences": [
            {
                "company": "Stripe",
                "title": "Principal Engineer",
                "startDate": "2021",
                "endDate": "Present",
                "isCurrent": true,
                "bullets": [
                    "Achieved exceeds expectations rating in all review cycles since joining",
                    "Selected for prestigious Technical Fellow track (top 1% of engineers)",
                    "Launched 3 critical infrastructure projects ahead of schedule, under budget"
                ]
            }
        ]
    }'::jsonb, NOW() - INTERVAL '2 weeks');

    -- Document 6: Side Project Portfolio
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_6, user_id_pe, 'side_projects.pdf', 'application/pdf', 35000, 'test/side_projects.pdf', 'resume', 'completed',
    '{
        "experiences": [
            {
                "company": "Personal Projects",
                "title": "Creator/Developer",
                "startDate": "2018",
                "endDate": "Present",
                "isCurrent": true,
                "bullets": [
                    "Built distributed key-value store (raftdb) with 3,500+ GitHub stars and used in production by 20+ companies",
                    "Created load testing framework generating 1M+ requests/second for performance benchmarking",
                    "Developed VS Code extension for distributed system visualization with 15,000+ installs"
                ]
            }
        ],
        "skills": ["Rust", "Go", "System Programming", "Developer Tools"]
    }'::jsonb, NOW() - INTERVAL '4 months');

    RAISE NOTICE 'Created Principal Engineer profile: %', user_id_pe;
END $$;


-- =============================================================================
-- PROFILE 2: RETAIL/CUSTOMER SERVICE WORKER
-- Entry-level candidate with service industry experience
-- =============================================================================
DO $$
DECLARE
    user_id_retail UUID := uuid_generate_v4();
    doc_id_1 UUID := uuid_generate_v4();
    doc_id_2 UUID := uuid_generate_v4();
    doc_id_3 UUID := uuid_generate_v4();
    doc_id_4 UUID := uuid_generate_v4();
    doc_id_5 UUID := uuid_generate_v4();
    doc_id_6 UUID := uuid_generate_v4();
    doc_id_7 UUID := uuid_generate_v4();
BEGIN
    -- Create user
    INSERT INTO users (id, name, email, created_at) VALUES
    (user_id_retail, 'Jessica Martinez', 'retail.worker@test.tailor.dev', NOW());

    -- Create profile
    INSERT INTO profiles (user_id, email, full_name, phone_number) VALUES
    (user_id_retail, 'retail.worker@test.tailor.dev', 'Jessica Martinez', '(512) 555-0202');

    -- Document 1: Main Resume
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_1, user_id_retail, 'jessica_martinez_resume.pdf', 'application/pdf', 65000, 'test/jessica_martinez_resume.pdf', 'resume', 'completed', 
    '{
        "contactInfo": {
            "name": "Jessica Martinez",
            "email": "jessica.m@email.com",
            "phone": "(512) 555-0202",
            "location": "Austin, TX"
        },
        "summary": "Dedicated customer service professional with 5+ years of experience in retail and food service. Known for exceeding sales targets, resolving customer issues, and training new team members. Seeking to leverage strong communication and problem-solving skills in a customer-focused role.",
        "experiences": [
            {
                "company": "Target",
                "title": "Guest Advocate Team Lead",
                "location": "Austin, TX",
                "startDate": "2022-03",
                "endDate": "Present",
                "isCurrent": true,
                "bullets": [
                    "Supervise team of 8 guest advocates, ensuring consistent delivery of exceptional customer service",
                    "Achieved 98% guest satisfaction score, highest in district for 6 consecutive months",
                    "Process 150+ transactions daily while maintaining accuracy rate above 99.5%",
                    "Resolve escalated customer complaints, reducing return rate by 15% through effective problem-solving",
                    "Train and onboard new team members, developing training materials that reduced orientation time by 30%",
                    "Manage front-end operations including scheduling, inventory, and cash handling ($50K+ daily)"
                ]
            },
            {
                "company": "Starbucks",
                "title": "Shift Supervisor",
                "location": "Austin, TX",
                "startDate": "2019-06",
                "endDate": "2022-02",
                "isCurrent": false,
                "bullets": [
                    "Led team of 5 baristas during high-volume shifts, serving 400+ customers daily",
                    "Exceeded quarterly sales targets by 20% through upselling and promotional initiatives",
                    "Maintained store cleanliness and safety standards, achieving 100% on health inspections",
                    "Managed inventory ordering and receiving, reducing waste by 12% through improved forecasting",
                    "Recognized as Partner of the Quarter for outstanding customer service and team collaboration"
                ]
            },
            {
                "company": "Old Navy",
                "title": "Sales Associate",
                "location": "Austin, TX",
                "startDate": "2017-08",
                "endDate": "2019-05",
                "isCurrent": false,
                "bullets": [
                    "Assisted 50+ customers daily with product selection, fitting rooms, and checkout",
                    "Consistently exceeded personal sales goals by 15-25% each quarter",
                    "Maintained visual merchandising standards, contributing to 10% increase in department sales",
                    "Processed returns and exchanges efficiently while maintaining positive customer relations"
                ]
            }
        ],
        "education": [
            {
                "institution": "Austin Community College",
                "degree": "Associate of Arts",
                "field": "Business Administration",
                "startDate": "2016",
                "endDate": "2018"
            }
        ],
        "certifications": [
            {"name": "ServSafe Food Handler", "issuer": "National Restaurant Association", "date": "2023-05"},
            {"name": "CPR/First Aid Certified", "issuer": "American Red Cross", "date": "2023-01"}
        ],
        "skills": ["Customer Service", "Cash Handling", "POS Systems", "Team Leadership", "Conflict Resolution", "Inventory Management", "Upselling", "Training & Development", "Microsoft Office", "Bilingual (Spanish/English)"]
    }'::jsonb, NOW());

    -- Document 2: Restaurant Experience
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_2, user_id_retail, 'restaurant_experience.pdf', 'application/pdf', 42000, 'test/restaurant_experience.pdf', 'resume', 'completed',
    '{
        "experiences": [
            {
                "company": "Chili''s Grill & Bar",
                "title": "Server",
                "location": "Austin, TX",
                "startDate": "2016-01",
                "endDate": "2017-07",
                "isCurrent": false,
                "bullets": [
                    "Provided excellent table service to 30+ guests per shift in fast-paced restaurant environment",
                    "Upsold appetizers and desserts, increasing average check size by 18%",
                    "Maintained knowledge of full menu including daily specials and allergen information",
                    "Collaborated with kitchen staff to ensure timely and accurate order delivery",
                    "Received consistently positive guest feedback and tips averaging 22% of sales"
                ]
            }
        ],
        "skills": ["Food Service", "Menu Knowledge", "Table Service", "Teamwork"]
    }'::jsonb, NOW() - INTERVAL '1 year');

    -- Document 3: Customer Service Achievements
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_3, user_id_retail, 'achievements_summary.pdf', 'application/pdf', 28000, 'test/achievements_summary.pdf', 'resume', 'completed',
    '{
        "experiences": [
            {
                "company": "Target",
                "title": "Guest Advocate Team Lead",
                "startDate": "2022",
                "endDate": "Present",
                "isCurrent": true,
                "bullets": [
                    "Won Team Member of the Month award 4 times in 2023",
                    "Selected to pilot new customer loyalty program rollout across 5 stores",
                    "Achieved highest REDcard sign-up rate in region (15% above target)"
                ]
            },
            {
                "company": "Starbucks",
                "title": "Shift Supervisor",
                "startDate": "2019",
                "endDate": "2022",
                "isCurrent": false,
                "bullets": [
                    "Promoted to shift supervisor after only 6 months as barista",
                    "Certified as Coffee Master, demonstrating expertise in coffee knowledge",
                    "Led store during manager absence, maintaining operational excellence"
                ]
            }
        ]
    }'::jsonb, NOW() - INTERVAL '2 months');

    -- Document 4: Training and Development
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_4, user_id_retail, 'training_experience.pdf', 'application/pdf', 32000, 'test/training_experience.pdf', 'resume', 'completed',
    '{
        "experiences": [
            {
                "company": "Target",
                "title": "Guest Advocate Team Lead",
                "startDate": "2022",
                "endDate": "Present",
                "isCurrent": true,
                "bullets": [
                    "Created comprehensive training checklist adopted by 3 other stores in the district",
                    "Mentored 12 new hires with 100% retention rate during probationary period",
                    "Developed role-playing scenarios for handling difficult customer situations"
                ]
            }
        ],
        "skills": ["Training", "Mentoring", "Documentation", "Knowledge Transfer"]
    }'::jsonb, NOW() - INTERVAL '3 months');

    -- Document 5: Bilingual Service Skills
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_5, user_id_retail, 'bilingual_service.pdf', 'application/pdf', 25000, 'test/bilingual_service.pdf', 'resume', 'completed',
    '{
        "experiences": [
            {
                "company": "Target",
                "title": "Guest Advocate Team Lead",
                "startDate": "2022",
                "endDate": "Present",
                "isCurrent": true,
                "bullets": [
                    "Serve as primary Spanish-language resource for customers, assisting 20+ Spanish-speaking guests weekly",
                    "Translated in-store signage and promotional materials for Hispanic Heritage Month events",
                    "Conducted bilingual customer surveys to improve service for diverse customer base"
                ]
            }
        ],
        "skills": ["Spanish (Native)", "English (Fluent)", "Cultural Competency", "Translation"]
    }'::jsonb, NOW() - INTERVAL '4 months');

    -- Document 6: Volunteer Work
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_6, user_id_retail, 'volunteer_experience.pdf', 'application/pdf', 22000, 'test/volunteer_experience.pdf', 'resume', 'completed',
    '{
        "experiences": [
            {
                "company": "Central Texas Food Bank",
                "title": "Volunteer Coordinator",
                "startDate": "2021",
                "endDate": "Present",
                "isCurrent": true,
                "bullets": [
                    "Coordinate weekend food distribution events serving 200+ families monthly",
                    "Recruit and train 15 new volunteers for food sorting and distribution duties",
                    "Organize donation drives at local businesses, collecting 5,000+ lbs of food annually"
                ]
            }
        ],
        "skills": ["Volunteer Management", "Event Coordination", "Community Outreach"]
    }'::jsonb, NOW() - INTERVAL '6 months');

    -- Document 7: Seasonal Work
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_7, user_id_retail, 'seasonal_work.pdf', 'application/pdf', 18000, 'test/seasonal_work.pdf', 'resume', 'completed',
    '{
        "experiences": [
            {
                "company": "Amazon",
                "title": "Seasonal Customer Service Associate",
                "location": "Austin, TX",
                "startDate": "2021-11",
                "endDate": "2022-01",
                "isCurrent": false,
                "bullets": [
                    "Handled 80+ customer calls daily during peak holiday season",
                    "Resolved order issues, delivery problems, and account inquiries",
                    "Maintained 95% customer satisfaction rating in high-pressure environment",
                    "Learned and navigated multiple internal systems to assist customers efficiently"
                ]
            }
        ],
        "skills": ["Phone Support", "Problem Resolution", "High-Volume Environment", "CRM Systems"]
    }'::jsonb, NOW() - INTERVAL '2 years');

    RAISE NOTICE 'Created Retail Worker profile: %', user_id_retail;
END $$;


-- =============================================================================
-- PROFILE 3: TEACHER TRANSITIONING TO TECH
-- Career changer with strong transferable skills
-- =============================================================================
DO $$
DECLARE
    user_id_teacher UUID := uuid_generate_v4();
    doc_id_1 UUID := uuid_generate_v4();
    doc_id_2 UUID := uuid_generate_v4();
    doc_id_3 UUID := uuid_generate_v4();
    doc_id_4 UUID := uuid_generate_v4();
    doc_id_5 UUID := uuid_generate_v4();
    doc_id_6 UUID := uuid_generate_v4();
    doc_id_7 UUID := uuid_generate_v4();
BEGIN
    -- Create user
    INSERT INTO users (id, name, email, created_at) VALUES
    (user_id_teacher, 'David Thompson', 'teacher.to.tech@test.tailor.dev', NOW());

    -- Create profile
    INSERT INTO profiles (user_id, email, full_name, phone_number, linkedin_url, portfolio_url) VALUES
    (user_id_teacher, 'teacher.to.tech@test.tailor.dev', 'David Thompson', '(503) 555-0303',
     'https://www.linkedin.com/in/davidthompson-dev', 'https://davidthompson.dev');

    -- Document 1: Career Transition Resume (Tech-focused)
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_1, user_id_teacher, 'david_thompson_tech_resume.pdf', 'application/pdf', 72000, 'test/david_thompson_tech_resume.pdf', 'resume', 'completed', 
    '{
        "contactInfo": {
            "name": "David Thompson",
            "email": "david.t@email.com",
            "phone": "(503) 555-0303",
            "linkedin": "linkedin.com/in/davidthompson-dev",
            "portfolio": "davidthompson.dev",
            "location": "Portland, OR"
        },
        "summary": "Former high school STEM teacher transitioning to software development with strong foundation in programming, data analysis, and technical instruction. Completed intensive full-stack bootcamp and built multiple web applications. Passionate about creating educational technology and user-focused solutions.",
        "experiences": [
            {
                "company": "Tech Academy Portland",
                "title": "Full Stack Development Student",
                "location": "Portland, OR",
                "startDate": "2024-01",
                "endDate": "2024-06",
                "isCurrent": false,
                "bullets": [
                    "Completed 800+ hours of intensive full-stack web development training",
                    "Built 5 full-stack applications using React, Node.js, Express, and PostgreSQL",
                    "Developed e-learning platform with video streaming, progress tracking, and quiz functionality",
                    "Created REST APIs serving 10,000+ requests in load testing scenarios",
                    "Collaborated with team of 4 developers on agile project with 2-week sprints"
                ]
            },
            {
                "company": "Lincoln High School",
                "title": "STEM Teacher & Department Chair",
                "location": "Portland, OR",
                "startDate": "2016-08",
                "endDate": "2023-12",
                "isCurrent": false,
                "bullets": [
                    "Taught Computer Science AP, Intro to Programming, and Statistics to 150+ students annually",
                    "Developed comprehensive Python curriculum resulting in 85% AP exam pass rate (vs 65% district average)",
                    "Created interactive coding exercises and automated grading systems using Python and JavaScript",
                    "Led technology integration initiatives, training 25 teachers on educational software tools",
                    "Designed data dashboard tracking student performance across 12 metrics",
                    "Managed $50K annual department budget for equipment and software licenses",
                    "Mentored 15 students in regional coding competitions with 5 state-level placements"
                ]
            },
            {
                "company": "Portland Public Schools",
                "title": "Math Teacher",
                "location": "Portland, OR",
                "startDate": "2012-08",
                "endDate": "2016-07",
                "isCurrent": false,
                "bullets": [
                    "Taught Algebra, Geometry, and Pre-Calculus to classes of 30 students",
                    "Improved standardized test scores by 22% through data-driven instruction methods",
                    "Implemented flipped classroom model using video lessons and interactive exercises",
                    "Collaborated with special education team to differentiate instruction for diverse learners"
                ]
            }
        ],
        "education": [
            {
                "institution": "Tech Academy Portland",
                "degree": "Certificate",
                "field": "Full Stack Web Development",
                "startDate": "2024-01",
                "endDate": "2024-06"
            },
            {
                "institution": "Portland State University",
                "degree": "Master of Education",
                "field": "Curriculum and Instruction",
                "startDate": "2014",
                "endDate": "2016"
            },
            {
                "institution": "University of Oregon",
                "degree": "Bachelor of Science",
                "field": "Mathematics",
                "startDate": "2008",
                "endDate": "2012",
                "honors": ["Cum Laude"]
            }
        ],
        "certifications": [
            {"name": "AWS Cloud Practitioner", "issuer": "Amazon Web Services", "date": "2024-05"},
            {"name": "freeCodeCamp Responsive Web Design", "issuer": "freeCodeCamp", "date": "2023-10"},
            {"name": "Oregon Teaching License", "issuer": "TSPC", "date": "2012"}
        ],
        "skills": ["JavaScript", "React", "Node.js", "Python", "PostgreSQL", "HTML/CSS", "Git", "REST APIs", "Agile/Scrum", "Curriculum Development", "Data Analysis", "Technical Writing", "Public Speaking", "Project Management"]
    }'::jsonb, NOW());

    -- Document 2: Teaching-Focused Resume
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_2, user_id_teacher, 'david_thompson_teaching_resume.pdf', 'application/pdf', 68000, 'test/david_thompson_teaching_resume.pdf', 'resume', 'completed',
    '{
        "summary": "Experienced STEM educator with 11 years of teaching experience and proven track record of improving student outcomes through innovative instruction and technology integration.",
        "experiences": [
            {
                "company": "Lincoln High School",
                "title": "STEM Teacher & Department Chair",
                "startDate": "2016",
                "endDate": "2023",
                "isCurrent": false,
                "bullets": [
                    "Served as Department Chair, coordinating curriculum across 8 STEM teachers",
                    "Wrote successful $25K grant for new computer lab equipment",
                    "Established coding club growing from 5 to 45 members over 4 years",
                    "Presented at 3 regional education conferences on technology in the classroom",
                    "Piloted 1:1 Chromebook program later adopted district-wide"
                ]
            }
        ],
        "skills": ["Classroom Management", "Assessment Design", "Parent Communication", "IEP Collaboration"]
    }'::jsonb, NOW() - INTERVAL '6 months');

    -- Document 3: Portfolio Projects
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_3, user_id_teacher, 'portfolio_projects.pdf', 'application/pdf', 55000, 'test/portfolio_projects.pdf', 'resume', 'completed',
    '{
        "experiences": [
            {
                "company": "Personal Projects",
                "title": "Full Stack Developer",
                "startDate": "2023",
                "endDate": "Present",
                "isCurrent": true,
                "bullets": [
                    "Built GradeTracker: student grade management app with React frontend and Node.js backend, used by 3 teachers in pilot program",
                    "Developed LessonPlan AI: tool using OpenAI API to generate differentiated lesson plans based on learning objectives",
                    "Created QuizBuilder: interactive quiz platform with real-time student response tracking and analytics dashboard",
                    "Deployed all projects on AWS using EC2, RDS, and S3 with CI/CD pipelines",
                    "Contributed to open-source education technology projects on GitHub"
                ]
            }
        ],
        "skills": ["AWS", "CI/CD", "MongoDB", "Express.js", "OpenAI API", "Deployment"]
    }'::jsonb, NOW() - INTERVAL '1 month');

    -- Document 4: Transferable Skills Summary
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_4, user_id_teacher, 'transferable_skills.pdf', 'application/pdf', 35000, 'test/transferable_skills.pdf', 'resume', 'completed',
    '{
        "experiences": [
            {
                "company": "Lincoln High School",
                "title": "STEM Teacher",
                "startDate": "2016",
                "endDate": "2023",
                "isCurrent": false,
                "bullets": [
                    "Debugged student code across Python, JavaScript, and Java, developing strong troubleshooting skills",
                    "Documented curriculum and processes in detailed technical guides for other teachers",
                    "Presented complex technical concepts to non-technical audiences (students, parents, administrators)",
                    "Managed multiple concurrent projects with strict deadlines (lesson planning, grading, parent conferences)",
                    "Adapted quickly to new technologies including LMS platforms, grading software, and remote teaching tools"
                ]
            }
        ],
        "skills": ["Technical Documentation", "Stakeholder Communication", "Deadline Management", "Adaptability"]
    }'::jsonb, NOW() - INTERVAL '2 months');

    -- Document 5: Bootcamp Capstone Project
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_5, user_id_teacher, 'capstone_project.pdf', 'application/pdf', 42000, 'test/capstone_project.pdf', 'resume', 'completed',
    '{
        "experiences": [
            {
                "company": "Tech Academy - Capstone Project",
                "title": "Lead Developer",
                "startDate": "2024-04",
                "endDate": "2024-06",
                "isCurrent": false,
                "bullets": [
                    "Led team of 4 in developing StudyBuddy, an AI-powered tutoring platform",
                    "Architected microservices backend handling user authentication, content management, and AI integration",
                    "Implemented WebSocket-based real-time chat for student-tutor communication",
                    "Designed PostgreSQL schema with 15 tables optimized for complex learning analytics queries",
                    "Achieved 95% code coverage with Jest and React Testing Library",
                    "Presented final project to panel of industry professionals, receiving highest marks in cohort"
                ]
            }
        ],
        "skills": ["Team Leadership", "System Architecture", "WebSockets", "Testing", "Presentation"]
    }'::jsonb, NOW() - INTERVAL '3 weeks');

    -- Document 6: Online Courses & Self-Study
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_6, user_id_teacher, 'online_courses.pdf', 'application/pdf', 28000, 'test/online_courses.pdf', 'resume', 'completed',
    '{
        "experiences": [
            {
                "company": "Self-Directed Learning",
                "title": "Student",
                "startDate": "2023",
                "endDate": "Present",
                "isCurrent": true,
                "bullets": [
                    "Completed CS50 Introduction to Computer Science (Harvard, edX) with verified certificate",
                    "Finished The Odin Project full stack curriculum with all projects completed",
                    "Earned multiple LinkedIn Learning certifications in React, TypeScript, and cloud computing",
                    "Built 20+ practice projects following Udemy courses on web development"
                ]
            }
        ],
        "certifications": [
            {"name": "CS50 Certificate", "issuer": "Harvard/edX", "date": "2023-08"},
            {"name": "The Odin Project", "issuer": "The Odin Project", "date": "2023-11"}
        ],
        "skills": ["Self-Directed Learning", "TypeScript", "Continuous Learning"]
    }'::jsonb, NOW() - INTERVAL '4 months');

    -- Document 7: Hackathon Experience
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_7, user_id_teacher, 'hackathon_experience.pdf', 'application/pdf', 22000, 'test/hackathon_experience.pdf', 'resume', 'completed',
    '{
        "experiences": [
            {
                "company": "PDX Tech Hackathon 2024",
                "title": "Team Lead",
                "startDate": "2024-03",
                "endDate": "2024-03",
                "isCurrent": false,
                "bullets": [
                    "Won 2nd place at 48-hour hackathon with team of 3 developers",
                    "Built accessibility-focused browser extension helping visually impaired users navigate web",
                    "Implemented text-to-speech and high-contrast mode features using Web Speech API",
                    "Pitched product to panel of judges from Nike, Intel, and local startups"
                ]
            }
        ],
        "skills": ["Rapid Prototyping", "Team Collaboration", "Product Pitching", "Accessibility"]
    }'::jsonb, NOW() - INTERVAL '2 months');

    RAISE NOTICE 'Created Teacher-to-Tech profile: %', user_id_teacher;
END $$;


-- =============================================================================
-- PROFILE 4: WAREHOUSE ASSOCIATE / FORKLIFT OPERATOR
-- Logistics and operations professional
-- =============================================================================
DO $$
DECLARE
    user_id_warehouse UUID := uuid_generate_v4();
    doc_id_1 UUID := uuid_generate_v4();
    doc_id_2 UUID := uuid_generate_v4();
    doc_id_3 UUID := uuid_generate_v4();
    doc_id_4 UUID := uuid_generate_v4();
    doc_id_5 UUID := uuid_generate_v4();
    doc_id_6 UUID := uuid_generate_v4();
BEGIN
    -- Create user
    INSERT INTO users (id, name, email, created_at) VALUES
    (user_id_warehouse, 'Robert Jackson', 'warehouse.operator@test.tailor.dev', NOW());

    -- Create profile
    INSERT INTO profiles (user_id, email, full_name, phone_number) VALUES
    (user_id_warehouse, 'warehouse.operator@test.tailor.dev', 'Robert Jackson', '(614) 555-0404');

    -- Document 1: Main Resume
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_1, user_id_warehouse, 'robert_jackson_resume.pdf', 'application/pdf', 58000, 'test/robert_jackson_resume.pdf', 'resume', 'completed', 
    '{
        "contactInfo": {
            "name": "Robert Jackson",
            "email": "r.jackson@email.com",
            "phone": "(614) 555-0404",
            "location": "Columbus, OH"
        },
        "summary": "Experienced warehouse professional with 8+ years in logistics, inventory management, and forklift operation. OSHA certified with clean safety record. Known for improving efficiency and reducing costs through process optimization.",
        "experiences": [
            {
                "company": "Amazon Fulfillment Center",
                "title": "Senior Warehouse Associate / Forklift Operator",
                "location": "Columbus, OH",
                "startDate": "2020-02",
                "endDate": "Present",
                "isCurrent": true,
                "bullets": [
                    "Operate sit-down, stand-up, and reach forklifts to move 200+ pallets per shift with zero accidents",
                    "Train and certify 25+ new forklift operators on equipment operation and safety protocols",
                    "Pick, pack, and ship 500+ orders daily maintaining 99.8% accuracy rate",
                    "Lead team of 8 associates during peak season, coordinating workflow to meet aggressive deadlines",
                    "Implemented pallet organization system reducing pick time by 15% in high-volume areas",
                    "Maintain inventory accuracy through cycle counting and RF scanner operations",
                    "Recognized as Safety Champion for 3 consecutive quarters with zero incidents in zone"
                ]
            },
            {
                "company": "Home Depot Distribution Center",
                "title": "Forklift Operator",
                "location": "Columbus, OH",
                "startDate": "2017-05",
                "endDate": "2020-01",
                "isCurrent": false,
                "bullets": [
                    "Operated reach trucks in 40-foot high rack storage environment",
                    "Loaded and unloaded 15+ trucks daily, ensuring proper weight distribution",
                    "Maintained equipment through daily inspections and minor maintenance",
                    "Achieved 100% on-time loading rate for 18 consecutive months",
                    "Cross-trained in receiving, putaway, and shipping departments"
                ]
            },
            {
                "company": "Kroger Distribution",
                "title": "Warehouse Associate",
                "location": "Columbus, OH",
                "startDate": "2015-03",
                "endDate": "2017-04",
                "isCurrent": false,
                "bullets": [
                    "Selected and palletized grocery orders for store delivery",
                    "Operated pallet jacks and cherry pickers in refrigerated warehouse environment",
                    "Met productivity standards of 150 cases per hour consistently",
                    "Assisted with inventory management and stock rotation (FIFO)",
                    "Promoted from general associate to certified equipment operator within 6 months"
                ]
            }
        ],
        "education": [
            {
                "institution": "Columbus State Community College",
                "degree": "Certificate",
                "field": "Supply Chain Management",
                "startDate": "2018",
                "endDate": "2019"
            },
            {
                "institution": "Eastmoor Academy High School",
                "degree": "High School Diploma",
                "field": "",
                "endDate": "2014"
            }
        ],
        "certifications": [
            {"name": "OSHA Forklift Certification", "issuer": "OSHA", "date": "2024-01"},
            {"name": "Powered Industrial Truck Operator", "issuer": "Amazon", "date": "2023-06"},
            {"name": "Hazardous Materials Handling", "issuer": "OSHA", "date": "2022-09"},
            {"name": "CPR/AED Certified", "issuer": "American Heart Association", "date": "2023-03"}
        ],
        "skills": ["Forklift Operation", "Reach Truck", "Order Picker", "Pallet Jack", "RF Scanner", "Inventory Management", "WMS Systems", "Loading/Unloading", "Safety Compliance", "Team Leadership", "FIFO/LIFO", "Cycle Counting", "Equipment Maintenance"]
    }'::jsonb, NOW());

    -- Document 2: Safety Training Records
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_2, user_id_warehouse, 'safety_certifications.pdf', 'application/pdf', 35000, 'test/safety_certifications.pdf', 'resume', 'completed',
    '{
        "experiences": [
            {
                "company": "Amazon Fulfillment Center",
                "title": "Safety Ambassador",
                "startDate": "2022",
                "endDate": "Present",
                "isCurrent": true,
                "bullets": [
                    "Selected as Safety Ambassador to promote workplace safety initiatives",
                    "Conduct weekly safety audits identifying and correcting potential hazards",
                    "Lead monthly safety meetings for team of 50+ warehouse associates",
                    "Developed quick-reference safety guides posted throughout facility",
                    "Achieved zero lost-time injuries in assigned zone for 24 consecutive months"
                ]
            }
        ],
        "certifications": [
            {"name": "OSHA 30-Hour General Industry", "issuer": "OSHA", "date": "2023-06"},
            {"name": "Lockout/Tagout Certified", "issuer": "Amazon", "date": "2022-03"}
        ],
        "skills": ["Safety Auditing", "Incident Investigation", "Safety Training", "Hazard Identification"]
    }'::jsonb, NOW() - INTERVAL '3 months');

    -- Document 3: Equipment Specializations
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_3, user_id_warehouse, 'equipment_certifications.pdf', 'application/pdf', 28000, 'test/equipment_certifications.pdf', 'resume', 'completed',
    '{
        "experiences": [
            {
                "company": "Amazon Fulfillment Center",
                "title": "Multi-Equipment Operator",
                "startDate": "2020",
                "endDate": "Present",
                "isCurrent": true,
                "bullets": [
                    "Certified to operate 5 different types of powered industrial equipment",
                    "Primary operator for VNA (Very Narrow Aisle) turret truck in high-density storage",
                    "Qualified on electric pallet jack, counterbalance forklift, reach truck, and order picker",
                    "Complete equipment pre-shift inspections documenting any maintenance needs"
                ]
            }
        ],
        "certifications": [
            {"name": "VNA Turret Truck Certification", "issuer": "Amazon", "date": "2023-01"},
            {"name": "Electric Pallet Jack", "issuer": "Amazon", "date": "2020-03"},
            {"name": "Counterbalance Forklift", "issuer": "Amazon", "date": "2020-04"}
        ],
        "skills": ["VNA Equipment", "Turret Truck", "Equipment Inspection", "Preventive Maintenance"]
    }'::jsonb, NOW() - INTERVAL '2 months');

    -- Document 4: Peak Season Leadership
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_4, user_id_warehouse, 'peak_season_performance.pdf', 'application/pdf', 32000, 'test/peak_season_performance.pdf', 'resume', 'completed',
    '{
        "experiences": [
            {
                "company": "Amazon Fulfillment Center",
                "title": "Peak Season Team Lead",
                "startDate": "2022-11",
                "endDate": "2023-01",
                "isCurrent": false,
                "bullets": [
                    "Temporarily promoted to lead 15-person team during Q4 peak season",
                    "Coordinated shift schedules and break rotations for optimal coverage",
                    "Achieved 110% of productivity targets while maintaining quality standards",
                    "Trained 12 seasonal employees on warehouse procedures and equipment",
                    "Reduced overtime costs by 20% through efficient workflow management"
                ]
            }
        ],
        "skills": ["Shift Scheduling", "Temporary Team Management", "Productivity Optimization", "Seasonal Staffing"]
    }'::jsonb, NOW() - INTERVAL '11 months');

    -- Document 5: Process Improvement Contributions
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_5, user_id_warehouse, 'process_improvements.pdf', 'application/pdf', 25000, 'test/process_improvements.pdf', 'resume', 'completed',
    '{
        "experiences": [
            {
                "company": "Amazon Fulfillment Center",
                "title": "Senior Warehouse Associate",
                "startDate": "2021",
                "endDate": "Present",
                "isCurrent": true,
                "bullets": [
                    "Submitted 8 Kaizen suggestions with 5 implemented, saving estimated $15,000 annually",
                    "Redesigned pallet staging area reducing forklift travel distance by 25%",
                    "Developed visual management system for inventory location using color-coded zones",
                    "Received $500 bonus for suggestion that improved shipping accuracy by 3%"
                ]
            }
        ],
        "skills": ["Kaizen", "Process Improvement", "5S", "Lean Principles", "Visual Management"]
    }'::jsonb, NOW() - INTERVAL '4 months');

    -- Document 6: Early Career Experience
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_6, user_id_warehouse, 'early_career.pdf', 'application/pdf', 22000, 'test/early_career.pdf', 'resume', 'completed',
    '{
        "experiences": [
            {
                "company": "UPS",
                "title": "Package Handler",
                "location": "Columbus, OH",
                "startDate": "2014-06",
                "endDate": "2015-02",
                "isCurrent": false,
                "bullets": [
                    "Sorted and loaded 1,000+ packages per shift in fast-paced hub environment",
                    "Maintained consistent performance meeting strict sort-to-door deadlines",
                    "Worked various shifts including overnight and early morning schedules",
                    "Zero misloads or damage incidents during tenure"
                ]
            }
        ],
        "skills": ["Package Handling", "Fast-Paced Environment", "Shift Flexibility", "Physical Stamina"]
    }'::jsonb, NOW() - INTERVAL '8 years');

    RAISE NOTICE 'Created Warehouse Operator profile: %', user_id_warehouse;
END $$;


-- =============================================================================
-- PROFILE 5: GOVERNMENT EMPLOYEE
-- Federal worker with detailed experience
-- =============================================================================
DO $$
DECLARE
    user_id_gov UUID := uuid_generate_v4();
    doc_id_1 UUID := uuid_generate_v4();
    doc_id_2 UUID := uuid_generate_v4();
    doc_id_3 UUID := uuid_generate_v4();
    doc_id_4 UUID := uuid_generate_v4();
    doc_id_5 UUID := uuid_generate_v4();
    doc_id_6 UUID := uuid_generate_v4();
    doc_id_7 UUID := uuid_generate_v4();
BEGIN
    -- Create user
    INSERT INTO users (id, name, email, created_at) VALUES
    (user_id_gov, 'Patricia Williams', 'government.employee@test.tailor.dev', NOW());

    -- Create profile
    INSERT INTO profiles (user_id, email, full_name, phone_number, linkedin_url) VALUES
    (user_id_gov, 'government.employee@test.tailor.dev', 'Patricia Williams', '(202) 555-0505',
     'https://www.linkedin.com/in/patriciawilliams-gov');

    -- Document 1: Federal Resume
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_1, user_id_gov, 'patricia_williams_federal_resume.pdf', 'application/pdf', 145000, 'test/patricia_williams_federal_resume.pdf', 'resume', 'completed', 
    '{
        "contactInfo": {
            "name": "Patricia Williams",
            "email": "p.williams@email.com",
            "phone": "(202) 555-0505",
            "linkedin": "linkedin.com/in/patriciawilliams-gov",
            "location": "Washington, DC"
        },
        "summary": "Results-driven federal program analyst with 12+ years of experience in policy implementation, budget management, and interagency coordination. Expertise in grants management, regulatory compliance, and stakeholder engagement. Proven ability to lead cross-functional teams and deliver complex initiatives on time and within budget.",
        "experiences": [
            {
                "company": "U.S. Department of Health and Human Services (HHS)",
                "title": "Program Analyst (GS-13)",
                "location": "Washington, DC",
                "startDate": "2019-03",
                "endDate": "Present",
                "isCurrent": true,
                "bullets": [
                    "Manage $45M annual grant portfolio supporting 35 community health programs across 12 states",
                    "Lead cross-functional team of 8 analysts reviewing grant applications and monitoring grantee compliance",
                    "Develop and implement performance metrics tracking program outcomes for 100,000+ beneficiaries",
                    "Draft policy memoranda and briefing documents for senior leadership on emerging health issues",
                    "Coordinate interagency working groups with CDC, CMS, and state health departments",
                    "Conduct site visits and technical assistance sessions ensuring grantee adherence to federal regulations",
                    "Prepare Congressional testimony materials and respond to GAO audit inquiries",
                    "Supervise 2 junior analysts, providing mentorship and professional development guidance"
                ]
            },
            {
                "company": "U.S. Department of Education",
                "title": "Management Analyst (GS-12)",
                "location": "Washington, DC",
                "startDate": "2015-06",
                "endDate": "2019-02",
                "isCurrent": false,
                "bullets": [
                    "Analyzed education program effectiveness using quantitative and qualitative research methods",
                    "Managed $20M discretionary grant program for career and technical education initiatives",
                    "Developed standardized reporting templates improving data collection efficiency by 30%",
                    "Facilitated stakeholder engagement sessions with school districts, state agencies, and advocacy groups",
                    "Authored portions of annual performance reports submitted to Congress",
                    "Served on selection panels reviewing 200+ grant applications annually",
                    "Implemented process improvements reducing grant processing time by 15 business days"
                ]
            },
            {
                "company": "U.S. Census Bureau",
                "title": "Survey Statistician (GS-11)",
                "location": "Suitland, MD",
                "startDate": "2012-01",
                "endDate": "2015-05",
                "isCurrent": false,
                "bullets": [
                    "Designed and tested survey instruments for American Community Survey and Current Population Survey",
                    "Analyzed demographic data using SAS and R, producing reports for policy makers",
                    "Collaborated with field staff to improve survey response rates by 8%",
                    "Presented findings at professional conferences including ASA and AAPOR",
                    "Contributed to methodological research on survey sampling techniques"
                ]
            }
        ],
        "education": [
            {
                "institution": "Georgetown University",
                "degree": "Master of Public Policy",
                "field": "Public Policy",
                "startDate": "2010",
                "endDate": "2012",
                "honors": ["Concentration in Social Policy"]
            },
            {
                "institution": "Howard University",
                "degree": "Bachelor of Arts",
                "field": "Political Science",
                "startDate": "2006",
                "endDate": "2010",
                "gpa": "3.7",
                "honors": ["Magna Cum Laude", "Phi Beta Kappa"]
            }
        ],
        "certifications": [
            {"name": "Project Management Professional (PMP)", "issuer": "PMI", "date": "2022-04"},
            {"name": "Certified Government Financial Manager (CGFM)", "issuer": "AGA", "date": "2020-09"},
            {"name": "FAC-P/PM Level II", "issuer": "FAI", "date": "2021-06"},
            {"name": "Lean Six Sigma Green Belt", "issuer": "ASQ", "date": "2019-11"},
            {"name": "Secret Security Clearance", "issuer": "DoD", "date": "2019"}
        ],
        "skills": ["Grants Management", "Policy Analysis", "Budget Formulation", "Program Evaluation", "Federal Acquisition", "Interagency Coordination", "Stakeholder Engagement", "Data Analysis", "SAS", "R", "Tableau", "Microsoft Office Suite", "Regulatory Compliance", "Congressional Relations", "Technical Writing"]
    }'::jsonb, NOW());

    -- Document 2: Earlier GS-9 Experience
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_2, user_id_gov, 'early_federal_career.pdf', 'application/pdf', 85000, 'test/early_federal_career.pdf', 'resume', 'completed',
    '{
        "experiences": [
            {
                "company": "U.S. Government Accountability Office (GAO)",
                "title": "Analyst Trainee (GS-9)",
                "location": "Washington, DC",
                "startDate": "2010-06",
                "endDate": "2011-12",
                "isCurrent": false,
                "bullets": [
                    "Participated in Professional Development Program rotating through 4 audit teams",
                    "Conducted research and data analysis supporting GAO reports to Congress",
                    "Assisted senior analysts with interviews of agency officials and document review",
                    "Drafted sections of reports on education and workforce development programs"
                ]
            }
        ],
        "skills": ["Audit Support", "Research", "Report Writing", "Interview Techniques"]
    }'::jsonb, NOW() - INTERVAL '12 years');

    -- Document 3: Awards and Recognition
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_3, user_id_gov, 'federal_awards.pdf', 'application/pdf', 42000, 'test/federal_awards.pdf', 'resume', 'completed',
    '{
        "experiences": [
            {
                "company": "U.S. Department of Health and Human Services",
                "title": "Program Analyst",
                "startDate": "2019",
                "endDate": "Present",
                "isCurrent": true,
                "bullets": [
                    "Received HHS Secretary Distinguished Service Award for COVID-19 response efforts (2021)",
                    "Awarded Agency Performance Bonus for exceptional contributions to grant oversight (2022, 2023)",
                    "Selected for Emerging Leaders Program, one of 25 participants agency-wide",
                    "Recognized with On-the-Spot Award for streamlining grant reporting processes"
                ]
            },
            {
                "company": "U.S. Department of Education",
                "title": "Management Analyst",
                "startDate": "2015",
                "endDate": "2019",
                "isCurrent": false,
                "bullets": [
                    "Received Department of Education Honor Award for Excellence in Program Administration",
                    "Named Employee of the Quarter for Q3 2017"
                ]
            }
        ]
    }'::jsonb, NOW() - INTERVAL '4 months');

    -- Document 4: Interagency Leadership
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_4, user_id_gov, 'interagency_leadership.pdf', 'application/pdf', 55000, 'test/interagency_leadership.pdf', 'resume', 'completed',
    '{
        "experiences": [
            {
                "company": "COVID-19 Response Team (Interagency Detail)",
                "title": "Operations Coordinator",
                "location": "Washington, DC",
                "startDate": "2020-04",
                "endDate": "2021-06",
                "isCurrent": false,
                "bullets": [
                    "Detailed to HHS interagency task force coordinating federal COVID-19 response",
                    "Managed distribution logistics for PPE and testing supplies to 50 states and territories",
                    "Coordinated daily briefings with White House, FEMA, and state emergency management",
                    "Developed tracking dashboard monitoring supply chain status for 500+ healthcare facilities",
                    "Worked 60+ hour weeks during peak pandemic response, maintaining 100% operational continuity"
                ]
            }
        ],
        "skills": ["Crisis Management", "Interagency Coordination", "Logistics", "Emergency Response"]
    }'::jsonb, NOW() - INTERVAL '2 years');

    -- Document 5: Training and Professional Development
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_5, user_id_gov, 'federal_training.pdf', 'application/pdf', 38000, 'test/federal_training.pdf', 'resume', 'completed',
    '{
        "experiences": [
            {
                "company": "Federal Executive Institute",
                "title": "Leadership Development Program",
                "location": "Charlottesville, VA",
                "startDate": "2023-06",
                "endDate": "2023-08",
                "isCurrent": false,
                "bullets": [
                    "Completed 8-week residential Leadership for a Democratic Society program",
                    "Developed agency change management proposal presented to HHS leadership",
                    "Collaborated with GS-14/15 executives from 20+ federal agencies"
                ]
            }
        ],
        "certifications": [
            {"name": "Federal Acquisition Certification for Contracting Officers Representative (FAC-COR)", "issuer": "FAI", "date": "2022-03"},
            {"name": "Privacy Act and FOIA Training", "issuer": "DOJ", "date": "2023-01"}
        ],
        "skills": ["Change Management", "Executive Leadership", "Federal Contracting"]
    }'::jsonb, NOW() - INTERVAL '5 months');

    -- Document 6: Policy Writing Samples
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_6, user_id_gov, 'policy_writing_portfolio.pdf', 'application/pdf', 48000, 'test/policy_writing_portfolio.pdf', 'resume', 'completed',
    '{
        "experiences": [
            {
                "company": "U.S. Department of Health and Human Services",
                "title": "Program Analyst",
                "startDate": "2019",
                "endDate": "Present",
                "isCurrent": true,
                "bullets": [
                    "Authored 25+ policy memoranda on grant administration and regulatory interpretation",
                    "Drafted Federal Register notices for 3 new grant programs totaling $75M in funding",
                    "Prepared briefing materials for Cabinet Secretary meetings with Congressional committees",
                    "Developed grant applicant guidance documents used by 500+ organizations nationally",
                    "Created standard operating procedures for grant monitoring adopted department-wide"
                ]
            }
        ],
        "skills": ["Policy Writing", "Regulatory Affairs", "Federal Register", "Legislative Analysis"]
    }'::jsonb, NOW() - INTERVAL '3 months');

    -- Document 7: Data Analysis Portfolio
    INSERT INTO documents (id, user_id, file_name, file_type, file_size, storage_path, document_type, parse_status, parsed_content, created_at) VALUES
    (doc_id_7, user_id_gov, 'data_analysis_portfolio.pdf', 'application/pdf', 35000, 'test/data_analysis_portfolio.pdf', 'resume', 'completed',
    '{
        "experiences": [
            {
                "company": "U.S. Department of Health and Human Services",
                "title": "Program Analyst",
                "startDate": "2020",
                "endDate": "Present",
                "isCurrent": true,
                "bullets": [
                    "Built Tableau dashboards visualizing program outcomes for 35 grant recipients",
                    "Conducted statistical analysis of health disparities data using R and SAS",
                    "Developed predictive models identifying grantees at risk of non-compliance",
                    "Automated quarterly reporting reducing data processing time from 2 weeks to 2 days"
                ]
            },
            {
                "company": "U.S. Census Bureau",
                "title": "Survey Statistician",
                "startDate": "2012",
                "endDate": "2015",
                "isCurrent": false,
                "bullets": [
                    "Analyzed multi-year trend data from Current Population Survey for policy research",
                    "Applied sampling weights and variance estimation techniques to survey data",
                    "Created reproducible analysis pipelines using SAS macros and R scripts"
                ]
            }
        ],
        "skills": ["Tableau", "R Programming", "SAS", "Statistical Analysis", "Data Visualization", "Predictive Modeling", "Survey Methodology"]
    }'::jsonb, NOW() - INTERVAL '6 months');

    RAISE NOTICE 'Created Government Employee profile: %', user_id_gov;
END $$;


-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check created users and document counts
SELECT 
    u.name,
    u.email,
    COUNT(d.id) as document_count,
    u.created_at
FROM users u
LEFT JOIN documents d ON u.id = d.user_id
WHERE u.email LIKE '%@test.tailor.dev'
GROUP BY u.id, u.name, u.email, u.created_at
ORDER BY u.created_at;

-- Show profiles with contact info
SELECT 
    full_name,
    email,
    phone_number,
    linkedin_url
FROM profiles p
JOIN users u ON p.user_id = u.id
WHERE u.email LIKE '%@test.tailor.dev';

-- =============================================================================
-- HOW TO ACCESS TEST PROFILES
-- =============================================================================
/*
After running this seed script:

1. TO LOG IN AS A TEST USER:
   - The easiest way is to create a session directly in the database
   - Or use the Supabase Auth Admin API to create a magic link

2. TO QUERY A TEST USER'S DATA:
   
   -- Get user ID for a specific test profile
   SELECT id, name, email FROM users WHERE email = 'principal.engineer@test.tailor.dev';
   
   -- View all documents for a user
   SELECT file_name, document_type, parse_status, 
          parsed_content->>'summary' as summary,
          jsonb_array_length(parsed_content->'experiences') as experience_count
   FROM documents
   WHERE user_id = (SELECT id FROM users WHERE email = 'principal.engineer@test.tailor.dev');
   
   -- View parsed experiences for a user
   SELECT 
       parsed_content->'contactInfo'->>'name' as name,
       exp->>'company' as company,
       exp->>'title' as title,
       exp->>'startDate' as start_date,
       exp->>'endDate' as end_date
   FROM documents,
   jsonb_array_elements(parsed_content->'experiences') as exp
   WHERE user_id = (SELECT id FROM users WHERE email = 'principal.engineer@test.tailor.dev')
   AND parse_status = 'completed';

3. TO TRIGGER INGESTION (populate canonical tables):
   - Run the reingest-browser.js script in browser console
   - Or call POST /api/ingest from API
   
4. TEST PROFILE EMAILS:
   - principal.engineer@test.tailor.dev (Senior tech leader)
   - retail.worker@test.tailor.dev (Customer service/retail)
   - teacher.to.tech@test.tailor.dev (Career changer - teacher to tech)
   - warehouse.operator@test.tailor.dev (Logistics/forklift operator)
   - government.employee@test.tailor.dev (Federal employee GS-13)

5. TO CLEAN UP TEST DATA:
   DELETE FROM users WHERE email LIKE '%@test.tailor.dev';
*/






