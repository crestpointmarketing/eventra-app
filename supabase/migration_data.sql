-- ============================================================
-- Eventra × EventPulse 数据迁移（第二步：数据导入）
-- 请先执行 migration_merge.sql，再执行本文件
-- 在 Eventra Supabase SQL Editor 中执行
-- ============================================================

-- 更新 check 约束，允许 'Monitor Only' 优先级
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_discovery_priority_check;
ALTER TABLE events ADD CONSTRAINT events_discovery_priority_check
  CHECK (discovery_priority IN ('High', 'Medium', 'Low', 'Monitor Only'));

-- 临时取消 owner_id NOT NULL 约束，迁移完成后回填并恢复
ALTER TABLE events ALTER COLUMN owner_id DROP NOT NULL;

-- ============================================================
-- 插入 EventPulse 事件（100 条）
-- ON CONFLICT DO NOTHING 防止重复执行时报错
-- ============================================================
INSERT INTO events (
  name, event_type, status,
  start_date, end_date, location,
  description, website_url, focus_area, target_audience,
  discovery_priority, source, external_id, expected_attendees
) VALUES

('CES 2026', 'conference', 'planning',
 '2026-01-06', '2026-01-10', 'Las Vegas, NV, USA',
 'CES is a premier global technology event held annually in Las Vegas, showcasing the latest advancements in consumer electronics and artificial intelligence. The 2026 event is scheduled from January 6 to January 10, featuring keynote speakers, product launches, and exhibitions from leading tech companies. It serves as a platform for innovation, networking, and exploring cutting-edge technologies in AI and related fields.',
 'https://www.ces.tech/', 'Tech expo with AI focus', 'Executives',
 'Medium', 'ai_discovered', 'CES-2026', 5000),

('Future of Education Technology Conference', 'conference', 'planning',
 '2026-01-11', '2026-01-14', 'Orlando, FL, USA',
 'The Future of Education Technology Conference (FETC) is an annual event focused on the latest trends and advancements in educational technology. Taking place in Orlando from January 11 to January 14, 2026, it brings together educators, administrators, and tech providers to explore innovative tools and strategies for enhancing learning environments. The conference features workshops, keynote sessions, and exhibits highlighting cutting-edge education technologies.',
 'https://www.fetc.org/', 'Educational technology and innovation', NULL,
 'Low', 'ai_discovered', 'FETC-2026', NULL),

('ACM Conference on Fairness, Accountability, and Transparency', 'conference', 'planning',
 '2026-01-14', '2026-01-17', 'Barcelona, Spain',
 'FAT* conference addresses societal and ethical challenges in AI including fairness, transparency, and accountability in AI systems. It gathers researchers, policymakers, and practitioners tackling responsible AI development.',
 'https://fatconference.org/2026/', 'AI Governance & Ethics', NULL,
 'Low', 'ai_discovered', 'FACT-2026', NULL),

('AAAI 2026', 'conference', 'planning',
 '2026-01-20', '2026-01-27', 'Singapore',
 'The Association for the Advancement of Artificial Intelligence hosts its annual conference in Singapore. This event is a hub for researchers and engineers to share findings across all subfields of AI. It includes technical sessions, tutorials, and discussions on ethical development.',
 'https://aaai.org', 'Advancing artificial intelligence research and technical innovation', NULL,
 'Low', 'ai_discovered', 'AAAI2-2026-4EM', NULL),

('Bett UK - Global Education Technology Conference', 'conference', 'planning',
 '2026-01-21', '2026-01-23', 'London, England, UK',
 'Bett UK is a leading education technology event held annually in London, showcasing the latest innovations in education and learning technologies. The 2026 event is scheduled from January 21 to January 23 and attracts educators, technology providers, and policymakers from around the world. It features exhibitions, keynote speakers, and opportunities for networking and professional development in educational tech.',
 'https://www.bettshow.com/', 'Educational technology', NULL,
 'Medium', 'ai_discovered', 'BETT-2026', NULL),

('AI & Big Data Expo Global', 'conference', 'planning',
 '2026-02-04', '2026-02-05', 'London, UK',
 'A leading event for Enterprise AI, IoT, Blockchain, and Cyber Security.',
 NULL, 'Enterprise AI, Big Data', NULL,
 'Medium', 'ai_discovered', 'AIBIG-2026-1F9', NULL),

('World AI Cannes Festival', 'conference', 'planning',
 '2026-02-12', '2026-02-14', 'Cannes, France',
 'This festival gathers business leaders and tech pioneers to discuss AI strategy and deployment in the French Riviera. It focuses on bridging the gap between innovation and market execution. Attendees explore real-world use cases for enterprise artificial intelligence.',
 'https://www.worldaicannes.com', 'Strategic business applications of artificial intelligence solutions', NULL,
 'Low', 'ai_discovered', 'WORLD-2026-EAA', NULL),

('TMC AI Summit', 'conference', 'planning',
 '2026-02-18', '2026-02-20', 'Houston, TX',
 NULL,
 'https://tmc-ai-summit.org/', 'Medical AI / Healthcare', 'researchers, leaders of medical institutions',
 'High', 'ai_discovered', 'TMC-2026', 500),

('Visionary Innovation in Virtual & Emerging Healthcare', 'conference', 'planning',
 '2026-02-22', '2026-02-25', 'Los Angeles, CA, USA',
 'ViVE is a leading healthcare technology conference focusing on innovation and digital transformation in healthcare. Held in Los Angeles from February 22 to 25, 2026, it brings together healthcare professionals, technology experts, and innovators to explore emerging solutions and trends in the industry. The event features keynote presentations, panels, and networking opportunities geared towards advancing healthcare through technology.',
 'https://viveevent.com/', 'Healthcare technology and innovation', NULL,
 'Low', 'ai_discovered', 'VIVE-2026', NULL),

('AIHealth 2026 - Third International Conference on AI-Health', 'conference', 'planning',
 '2026-03-08', '2026-03-12', 'Valencia, Spain',
 'Academic conference covering precision medicine, deep learning for radiology, and personalized health.',
 'https://www.iaria.org/conferences2026/AIHealth26.html', 'Scientific directions in AI-in-Health and predictive analytics', NULL,
 'Medium', 'ai_discovered', 'AIHEA-2026-XCM', NULL),

('Gartner Data & Analytics Summit', 'conference', 'planning',
 '2026-03-09', '2026-03-11', 'Orlando, USA',
 'Focuses on the future of data and analytics, including AI leadership and governance.',
 'https://www.gartner.com/en/conferences/na/data-analytics-us', 'Data Analytics, AI Governance', NULL,
 'Low', 'ai_discovered', 'GARTN-2026-77W', NULL),

('HIMSS 2026 - Exhibitor', 'conference', 'planning',
 '2026-03-09', '2026-03-12', 'Las Vegas, NV, USA',
 'The HIMSS Global Conference is a leading event for professionals in healthcare information and management systems. Scheduled for March 9-12, 2026, at the Venetian Convention and Expo Center in Las Vegas, it highlights innovations and trends transforming healthcare delivery. The conference offers education sessions, networking, and exhibitions dedicated to advancing healthcare through IT solutions.',
 'https://www.himss.org/global-conference', 'Healthcare information technology and management systems', NULL,
 'High', 'ai_discovered', 'HIMSS-2026', 2000),

('SXSW EDU - South by Southwest Education Conference', 'conference', 'planning',
 '2026-03-09', '2026-03-12', 'Austin, TX, USA',
 'SXSW EDU is a conference and festival focused on innovations and trends in education. Held annually in Austin, Texas, the 2026 event runs from March 9 to 12 and gathers educators, policymakers, and technology innovators to explore new approaches and technologies impacting education systems globally.',
 'https://www.sxswedu.com/', 'Education innovation and technology', NULL,
 'Low', 'ai_discovered', 'SXSWEDU-2026', NULL),

('NVIDIA GTC 2026', 'conference', 'planning',
 '2026-03-16', '2026-03-19', 'San Jose, CA, USA',
 'NVIDIA GTC is a leading conference focusing on GPU technology, artificial intelligence, deep learning, and accelerated computing. The 2026 event will be held in San Jose, California, from March 16 to 19, with workshops starting on March 15. It offers technical sessions, keynotes, and hands-on labs for developers, researchers, and industry professionals to explore cutting-edge advancements.',
 'https://www.nvidia.com/gtc/', 'GPU technology, AI, deep learning, and accelerated computing', NULL,
 'Low', 'ai_discovered', 'GTC-2026', NULL),

('KubeCon + CloudNativeCon Europe', 'conference', 'planning',
 '2026-03-23', '2026-03-26', 'Amsterdam, Netherlands',
 'The Cloud Native Computing Foundation''s flagship conference gathers adopters and technologists from leading open-source communities. It highlights how Kubernetes and cloud-native tools facilitate scalable AI deployment and management. Participants discuss the evolving landscape of MLOps and infrastructure automation.',
 'https://www.cncf.io', 'Cloud native computing and AI infrastructure management', NULL,
 'Low', 'ai_discovered', 'KUBEC-2026-W6H', NULL),

('HumanX 2026', 'conference', 'planning',
 '2026-04-06', '2026-04-09', 'San Francisco, USA',
 'HumanX is the premier AI gathering where global leaders, innovators, and visionaries come together. No other event gives you this combination of practical insight, exclusive networking, and unforgettable experiences.',
 'https://www.humanx.co', 'Human-centric AI, Policy', NULL,
 'Monitor Only', 'ai_discovered', 'HUMAN-2026-VW3', NULL),

('Enterprise AI Maturity & Transformation Assembly', 'conference', 'planning',
 '2026-04-08', '2026-04-09', 'The Biltmore, Miami, FL, USA',
 'A high-level assembly for senior executives focused on the digital transformation and maturity of AI within large enterprises.',
 'https://mill-all.com', 'Enterprise AI strategy, digital transformation, data governance', NULL,
 'Monitor Only', 'ai_discovered', 'ENTER-2026-N1D', NULL),

('RE•WORK AI in Finance Summit - New York', 'conference', 'planning',
 '2026-04-10', '2026-04-16', 'New York, NY, USA',
 'The AI in Finance Summit focuses on the application of artificial intelligence and machine learning in banking, financial services, and insurance sectors. The 2026 event in New York brings together industry leaders, researchers, and technology innovators to explore the latest advancements and practical uses of AI in finance.',
 'https://www.re-work.co/events/ai-in-finance-summit-new-york-2026', 'AI in Finance Summit New York', NULL,
 'Monitor Only', 'ai_discovered', 'AIFS-NY-2026', NULL),

('Generative AI Summit 2026', 'conference', 'planning',
 '2026-04-13', '2026-04-15', 'London, UK',
 'Focuses on AI-native enterprise architectures and scaling generative models.',
 'https://generativeaisummit.com', 'Operationalizing and scaling generative AI, agentic intelligence orchestration', NULL,
 'Monitor Only', 'ai_discovered', 'GENER-2026-2QW', NULL),

('2026 MIT Enterprise AI Forum', 'conference', 'planning',
 '2026-04-14', '2026-04-15', 'Cambridge, MA, USA',
 'An academic-to-industry crossover event focusing on scalable AI systems and research-driven enterprise strategies.',
 'https://ilp.mit.edu', '2026 MIT AI Conference', NULL,
 'Monitor Only', 'ai_discovered', '2026M-2026-2SK', NULL),

('AI in Finance Summit NY', 'conference', 'planning',
 '2026-04-15', '2026-04-16', 'New York, NY, USA',
 'This summit focuses on the latest advancements in AI for the banking and finance sectors. Experts discuss algorithmic trading, risk management, and fraud detection using machine learning. It provides a unique opportunity for networking among fintech leaders in New York.',
 'https://ny-ai-finance.re-work.co/', 'Financial services optimization through artificial intelligence technologies', NULL,
 'Low', 'ai_discovered', 'AIINF-2026-DX3', NULL),

('BioLogic Summit', 'conference', 'planning',
 '2026-04-20', '2026-04-22', 'Boston, MA, USA',
 'BioLogic Summit is an annual event that focuses on advancements and innovation in biotechnology and life sciences. It gathers scientists, industry leaders, and entrepreneurs to discuss emerging technologies, trends, and collaborations in the biotech sector. The 2026 summit will feature keynote presentations, panel discussions, and networking opportunities.',
 'https://www.biologicsummit.com', 'Biotechnology and Life Sciences', NULL,
 'Monitor Only', 'ai_discovered', 'BIOLOGIC-2026', NULL),

('DMEA 2026', 'conference', 'planning',
 '2026-04-21', '2026-04-23', 'Berlin, Germany',
 'DMEA is Europe''s leading event for digital health technologies and solutions. The 2026 conference in Berlin focuses on innovations in health IT and the digital transformation of healthcare. It gathers industry experts, healthcare providers, and technology innovators to showcase advances and discuss trends in digital medicine.',
 'https://www.dmea.de/en/', 'Health IT and digital healthcare', NULL,
 'Low', 'ai_discovered', 'DMEA-2026', NULL),

('Google Cloud Next 2026', 'conference', 'planning',
 '2026-04-22', '2026-04-24', 'Las Vegas, NV, USA',
 'Major cloud computing event with a heavy emphasis on Google Cloud AI.',
 'https://cloud.google.com/next', 'Generative AI innovations, multimodal AI applications, data platforms, and MLOps', NULL,
 'Monitor Only', 'ai_discovered', 'GOOGL-2026-257', NULL),

('Global AI & Automation Congress', 'conference', 'planning',
 '2026-04-22', '2026-04-24', 'Berlin, Germany',
 'GIAC is a congress examining advances in AI technologies with an emphasis on robotics and automation. Participants include researchers, engineers, and industry leaders focused on intelligent systems.',
 'https://giac2026.com', 'Robotics & Automation', NULL,
 'Monitor Only', 'ai_discovered', 'GIAC-2026', NULL),

('ICLR 2026', 'conference', 'planning',
 '2026-04-23', '2026-04-27', 'Rio de Janeiro, Brazil',
 'ICLR 2026 is a premier conference focusing on deep learning and representation learning. The event brings together academic and industry experts for workshops, presentations, and discussions on cutting-edge research. It plays a vital role in shaping advancements in machine learning and AI technologies.',
 'https://iclr.cc', 'Machine Learning, Deep Learning', NULL,
 'Medium', 'ai_discovered', 'ICLR-2026', NULL),

('Rice Business Healthcare Conference: AI in Healthcare', 'conference', 'planning',
 '2026-04-24', '2026-04-24', 'McNair Hall, Rice University, Houston, Texas',
 'Healthcare systems, digital innovation, and the future of care delivery.',
 'https://business.rice.edu/healthcare-conference', 'Healthcare systems, digital innovation, and the future of care delivery', NULL,
 NULL, 'ai_discovered', 'RICEB-2026-I0S', NULL),

('AI & Machine Learning Conference', 'conference', 'planning',
 '2026-04-27', '2026-04-29', 'San Francisco, CA, USA',
 'The AIM Conference 2026, organized by United Scientific Group, focuses on emerging trends and technologies in artificial intelligence and machine learning. Held at the DoubleTree by Hilton near San Francisco Airport, the event brings together researchers, industry leaders, and practitioners to discuss innovations and applications in AI and ML.',
 'https://unitedscientificgroup.com/conferences/aim-2026/', 'Emerging AI/ML technologies', NULL,
 'Monitor Only', 'ai_discovered', 'AIML-2026', NULL),

('2026 Artificial Intelligence for Hospitals & Health Plans Summit', 'conference', 'planning',
 '2026-04-27', '2026-04-28', 'New Orleans, LA, USA',
 'Artificial intelligence is rapidly becoming an essential tool for modern healthcare. This conference brings together leaders from hospitals, health systems, and health plans to explore how AI is reshaping the way care is delivered, managed, and financed. From clinical decision support and predictive analytics to claims automation and member engagement, AI is unlocking new levels of efficiency, accuracy, and personalization across the healthcare ecosystem.',
 'https://www.wcforum.com/conferences/ai-health', 'Clinical decision support, predictive analytics, claims automation', NULL,
 'Low', 'ai_discovered', '2026A-2026-WH3', NULL),

('AI Summit New York', 'conference', 'planning',
 '2026-05-05', '2026-05-07', 'New York, USA',
 'Regional edition of AI Summit focusing on AI trends in the US market.',
 'https://aisummit.com/newyork-2026', 'Artificial Intelligence', NULL,
 'Low', 'ai_discovered', 'ASNY-2026', NULL),

('IEEE Conference on Artificial Intelligence (IEEE CAI 2026)', 'conference', 'planning',
 '2026-05-08', '2026-05-10', 'Granada, Spain',
 'Broad industrial AI conference with specialized vertical tracks for healthcare applications.',
 'https://cai.ieee.org/2026', 'Industrial applications of AI including Healthcare and Life Sciences', NULL,
 'Low', 'ai_discovered', 'IEEEC-2026-377', NULL),

('Embedded Vision Summit 2026', 'conference', 'planning',
 '2026-05-11', '2026-05-13', 'Santa Clara, California, USA',
 'Focuses on deploying computer vision in embedded systems and products.',
 'https://embeddedvisionsummit.com', 'Computer Vision at the Edge, Visual AI, Perceptual AI', NULL,
 'Medium', 'ai_discovered', 'EMBED-2026-J7H', NULL),

('Gartner Data & Analytics Summit 2026', 'conference', 'planning',
 '2026-05-11', '2026-05-13', 'ExCeL London, UK',
 'A major global summit for data and analytics leaders to discuss organizational strategy and AI scaling.',
 'https://www.gartner.com', 'Intersection of AI and business scaling decisions, AI governance, agentic operations', NULL,
 'Medium', 'ai_discovered', 'GARTN-2026-AN8', NULL),

('The National AI in Healthcare Conference 2026', 'conference', 'planning',
 '2026-05-12', '2026-05-12', 'Amsterdam, Netherlands',
 NULL,
 'https://aic4nl.nl/', 'Practical and clinical implementation of AI in daily healthcare practices', NULL,
 NULL, 'ai_discovered', 'THENA-2026-SVS', NULL),

('AI for Good Global Summit', 'conference', 'planning',
 '2026-05-12', '2026-05-14', 'Geneva, Switzerland',
 'Organized by ITU, the AI for Good Global Summit focuses on leveraging AI to address global challenges such as health, education, and sustainability. It showcases case studies and hosts policy discussions aimed at maximizing AI''s positive impact on society. The summit attracts policymakers, researchers, and industry leaders engaged in ethical AI development.',
 'https://aiforgood.itu.int/', 'AI for social impact and governance', NULL,
 'Low', 'ai_discovered', 'AIFG-2026', NULL),

('Conference on Machine Learning and Systems', 'conference', 'planning',
 '2026-05-17', '2026-05-22', 'Bellevue, WA, USA',
 'MLSys 2026 focuses on the intersection of machine learning and systems design, exploring advances in scalable and efficient ML infrastructure. The conference brings together researchers and practitioners to share innovations and best practices. It will be held at the Hyatt Regency Bellevue in Bellevue, Washington.',
 'https://mlsys.org/2026', 'Machine learning and systems design', NULL,
 'Low', 'ai_discovered', 'MLSYS-2026', NULL),

('AI & Big Data Expo North America 2026', 'conference', 'planning',
 '2026-05-18', '2026-05-19', 'San Jose, CA, USA',
 'A massive exhibition and conference focusing on the integration of Big Data and AI into enterprise ecosystems.',
 'https://www.ai-expo.net/northamerica/', 'Real-world enterprise AI adoption, generative AI, MLOps enterprise optimization', NULL,
 'Medium', 'ai_discovered', 'AIBIG-2026-EMG', NULL),

('IEEE International Conference on Robotics and Automation', 'conference', 'planning',
 '2026-05-18', '2026-05-22', 'Orlando, FL, USA',
 'ICRA 2026 is a premier event focusing on automation and the integration of AI in robotics. It includes research presentations, workshops, and exhibitions from leading academics and industry experts. The conference serves as a platform for sharing cutting-edge advancements and fostering collaboration in robotics and AI.',
 'https://www.icra2026.org', 'Robotics and AI integration', NULL,
 'Low', 'ai_discovered', 'ICRA-2026', NULL),

('Google I/O 2026', 'conference', 'planning',
 '2026-05-19', '2026-05-20', 'Mountain View, CA, USA',
 'Google I/O is an annual developer conference featuring deep dives into the company''s latest software and hardware. The event highlights major updates to Android, Chrome, and AI-driven products like Gemini. Developers gather to learn about new APIs and tools for building intelligent applications.',
 'https://io.google', 'Developer ecosystem and generative AI consumer products', NULL,
 'Low', 'ai_discovered', 'GOOGL-2026-9DG', NULL),

('Bio-IT World Expo', 'trade_show', 'planning',
 '2026-05-19', '2026-05-21', 'Boston, MA, USA',
 'Bio-IT World Expo is a leading conference and exhibition focusing on bioinformatics, computational biology, and life sciences IT. It brings together scientists, technology providers, and industry experts to explore the latest advances in data analysis, sequencing, and biomedical informatics. The 2026 event will showcase innovative tools and solutions to accelerate research and development in the life sciences sector.',
 'https://www.bio-itworldexpo.com', 'Bioinformatics and Life Sciences IT', NULL,
 'High', 'ai_discovered', 'BIOIT-2026', NULL),

('Reuters Events: Digital Health 2026', 'conference', 'planning',
 '2026-05-20', '2026-05-21', 'Chicago, IL, USA',
 'Focuses on care delivery and data strategy for health system leadership.',
 'https://events.reutersevents.com/healthcare/digital-health-usa', 'Strategic leadership in digital health and AI adoption', NULL,
 'Medium', 'ai_discovered', 'REUTE-2026-ODF', NULL),

('RE•WORK AI in Life Sciences Summit', 'conference', 'planning',
 '2026-05-20', '2026-05-21', 'Boston, USA',
 'RE•WORK AI in Life Sciences Summit 2026 targets professionals at the intersection of AI and life sciences. This event focuses on breakthroughs in AI applications for drug discovery, diagnostics, and healthcare research.',
 'https://www.re-work.co/events/ai-in-life-sciences-summit-2026', 'AI in Life Sciences', NULL,
 'Low', 'ai_discovered', 'AILS-2026', NULL),

('ICRA 2026', 'conference', 'planning',
 '2026-06-01', '2026-06-05', 'Vienna, Austria',
 'The International Conference on Robotics and Automation is a flagship event of the IEEE Robotics and Automation Society. It features peer-reviewed research, workshops, and exhibitions on the future of autonomous machines. Participants discuss the integration of machine learning into physical robotic hardware.',
 'https://www.ieee-ras.org', 'Advancements in robotics engineering and automated systems', NULL,
 'Low', 'ai_discovered', 'ICRA2-2026-T06', NULL),

('Money 20/20 Europe', 'conference', 'planning',
 '2026-06-02', '2026-06-04', 'Amsterdam, Netherlands',
 'Money 20/20 Europe is the largest fintech event on the continent, focusing on the future of money. The conference explores how AI is revolutionizing payments, banking, and financial services ecosystems. It brings together senior leaders from across the global financial landscape.',
 'https://europe.money2020.com', 'Intersections of fintech and intelligent payment systems', NULL,
 'Low', 'ai_discovered', 'MONEY-2026-XHO', NULL),

('Computex Taipei 2026', 'trade_show', 'planning',
 '2026-06-02', '2026-06-05', 'Taipei, Taiwan',
 'The center of the global hardware supply chain. Keynotes from CEOs of NVIDIA, AMD, Intel, and Qualcomm often reveal the server racks, cooling solutions, and chips that power AI infrastructure.',
 'https://www.computextaipei.com.tw/', 'Supply Chain, Server Hardware, Chips, Edge AI', NULL,
 NULL, 'ai_discovered', 'COMPU-2026-DNI', NULL),

('CVPR 2026 - Computer Vision and Pattern Recognition', 'conference', 'planning',
 '2026-06-03', '2026-06-07', 'Denver, CO, USA',
 'The Conference on Computer Vision and Pattern Recognition is a premier annual event for researchers in image processing. It covers a wide range of topics from object detection to synthetic media generation. The event is essential for staying current with foundational vision-based AI research.',
 'https://www.thecvf.com', 'Computer vision and pattern recognition research excellence', NULL,
 'Low', 'ai_discovered', 'CVPR2-2026-R92', NULL),

('Digital Health & AI Innovation Summit', 'conference', 'planning',
 '2026-06-08', '2026-06-09', 'Boston, MA, USA',
 'Discusses digital health investment trends and startup innovations in AI.',
 'https://digital-health-ai-summit.worldbigroup.com', 'Intersection of AI investment and clinical innovation', NULL,
 'Medium', 'ai_discovered', 'DIGIT-2026-0YC', NULL),

('The AI Summit London', 'conference', 'planning',
 '2026-06-10', '2026-06-11', 'London, UK',
 'Part of London Tech Week, The AI Summit is one of the world''s leading events for AI in business. It attracts a diverse crowd ranging from tech giants to emerging startups and government officials. Discussions center on practical implementation of AI across various industrial sectors.',
 'https://london.theaisummit.com', 'Enterprise AI implementation and business growth strategies', NULL,
 'Low', 'ai_discovered', 'THEAI-2026-WHX', NULL),

('AI Summit London', 'conference', 'planning',
 '2026-06-10', '2026-06-11', 'London, UK',
 'Annual AI Summit covering the latest in artificial intelligence research and applications in London.',
 'https://london.theaisummit.com/', 'Artificial Intelligence', NULL,
 'High', 'ai_discovered', 'ASIL-2026', NULL),

('AI Summit - General Edition', 'conference', 'planning',
 '2026-06-15', '2026-06-16', 'London, England, United Kingdom',
 'AI Summit is a leading conference focused on the practical applications and impact of artificial intelligence across various industries. The 2026 event in London will showcase innovations, keynote speeches, and networking opportunities with experts and business leaders. It emphasizes real-world AI solutions and their transformative potential.',
 'https://theaisummit.com/', 'Artificial Intelligence and Industry Applications', NULL,
 'Low', 'ai_discovered', 'AIS-2026', NULL),

('Conference on Computer Vision and Pattern Recognition', 'conference', 'planning',
 '2026-06-15', '2026-06-20', 'Vancouver, Canada',
 'CVPR is a top conference for computer vision and pattern recognition research and applications. It attracts researchers, developers, and companies interested in image analysis and AI vision technologies.',
 'https://cvpr2026.thecvf.com', 'Applied Machine Learning', NULL,
 'Low', 'ai_discovered', 'CVPR-2026', NULL),

('Data + AI Summit 2026', 'conference', 'planning',
 '2026-06-15', '2026-06-18', 'San Francisco, CA, USA',
 'Organized by Databricks, this summit focuses on the convergence of data, analytics, and artificial intelligence. It features technical deep dives into Apache Spark, Delta Lake, and generative AI platform architectures. Attendees learn how to build robust data pipelines for modern AI applications.',
 'https://www.databricks.com/dataaisummit', 'Data engineering and generative AI system design', NULL,
 'Low', 'ai_discovered', 'DATAA-2026-LPZ', NULL),

('Databricks Data + AI Summit', 'conference', 'planning',
 '2026-06-15', '2026-06-18', 'San Francisco, CA, USA',
 'The Databricks Data + AI Summit 2026 is a leading event focused on data engineering, AI, and machine learning solutions built on the Databricks platform. It gathers data scientists, engineers, and business leaders to explore innovations, best practices, and case studies in managing data and AI workflows.',
 'https://databricks.com/data-ai-summit', 'Data engineering and AI platform solutions', NULL,
 'Low', 'ai_discovered', 'DDAI-2026', NULL),

('HLTH Europe 2026', 'conference', 'planning',
 '2026-06-15', '2026-06-18', 'Amsterdam, Netherlands',
 'Extensive tracks on data, AI, and digital transformation within the European health sector.',
 'https://europe.hlth.com', 'European health innovation ecosystem and predictive health', NULL,
 'High', 'ai_discovered', 'HLTHE-2026-U6E', NULL),

('Medical Artificial Intelligence Summit', 'conference', 'planning',
 '2026-06-15', '2026-06-17', 'Berlin, Germany',
 'The Medical AI Summit focuses on AI applications in healthcare, including diagnostics, imaging, and patient management. It brings together clinicians, AI researchers, and industry experts to share innovations in medical AI technologies.',
 'https://medicalaisummit.com/2026', 'Medical AI / Healthcare', NULL,
 'Low', 'ai_discovered', 'MEDAI-2026', NULL),

('ISC High Performance 2026', 'conference', 'planning',
 '2026-06-22', '2026-06-26', 'Hamburg, Germany',
 'A leading European event for HPC, AI methodologies, and quantum computing.',
 'https://isc-hpc.com/', 'High-performance computing, AI methodologies, and hybrid quantum computing', NULL,
 'Medium', 'ai_discovered', 'ISCHI-2026-NOC', NULL),

('International Symposium on Robotics', 'conference', 'planning',
 '2026-06-22', '2026-06-25', 'Tokyo, Japan',
 'ISR 2026 is an international event showcasing advancements in robotics technology and applications worldwide. It brings together researchers, engineers, and industry players to present innovations in robot design, AI integration, and automation systems.',
 'https://isr2026.org', 'Robotics & Automation', NULL,
 'Low', 'ai_discovered', 'ISR-2026', NULL),

('Machine Learning for Healthcare Conference', 'conference', 'planning',
 '2026-06-23', '2026-06-26', 'Ann Arbor, USA',
 'The ML4H Conference focuses on machine learning applications in healthcare, bringing together researchers, clinicians, and industry to advance AI integration in medical technology. The event includes workshops, presentations, and networking opportunities aimed at improving healthcare outcomes with AI.',
 'https://mlhc.ai', 'Medical AI / Healthcare', NULL,
 'Low', 'ai_discovered', 'ML4H-2026', NULL),

('ISTE Live - International Society for Technology in Education', 'conference', 'planning',
 '2026-06-28', '2026-07-01', 'Orlando, FL, USA',
 'ISTELive 2026 is the annual conference organized by the International Society for Technology in Education, focusing on the latest trends and innovations in educational technology. The event gathers educators, technology leaders, and policymakers to share best practices and explore new tools that enhance learning experiences.',
 'https://www.iste.org/iste-live', 'Educational technology and innovation', NULL,
 'Low', 'ai_discovered', 'ISTE-2026', NULL),

('Global AI Show Riyadh 2026', 'conference', 'planning',
 '2026-06-29', '2026-06-30', 'Riyadh, Saudi Arabia',
 'Projected as the largest AI event in the Middle East.',
 'https://globalaishow.com/riyadh', 'AI regulation, enterprise-grade Generative AI solutions, large-scale deployment', NULL,
 'High', 'ai_discovered', 'GLOBA-2026-X13', NULL),

('CogX Festival of AI', 'conference', 'planning',
 '2026-07-06', '2026-07-09', 'London, UK',
 'CogX 2026 convenes AI experts, innovators, and policymakers to explore the future of AI and emerging technologies through talks, workshops, and networking opportunities. The conference aims to drive conversations on AI''s impact across sectors and foster collaboration among industry leaders and researchers.',
 'https://cogx.live', 'Emerging AI technologies, future of AI', NULL,
 'Low', 'ai_discovered', 'COGX-2026', NULL),

('International Conference on Machine Learning', 'conference', 'planning',
 '2026-07-06', '2026-07-11', 'Barcelona, Spain',
 'The International Conference on Machine Learning (ICML) is a premier annual event highlighting the latest research and advancements in machine learning. The 2026 conference will be held in Barcelona, bringing together researchers and practitioners worldwide for presentations, workshops, and discussions.',
 'https://icml.cc', 'Machine learning research', NULL,
 'Low', 'ai_discovered', 'ICML-2026', NULL),

('AIME 2026 - AI in Medicine', 'conference', 'planning',
 '2026-07-07', '2026-07-10', 'Ottawa, Canada',
 'Academic and scientific conference focused on AI applications within the medical field.',
 'https://aime-society.org', 'Theoretical and applied AI in medical diagnosis and patient care', NULL,
 'Medium', 'ai_discovered', 'AIME2-2026-36I', NULL),

('Education AI Conference', 'conference', 'planning',
 '2026-07-07', '2026-07-09', 'Vienna, Austria',
 'EDUAI 2026 is a newly announced conference focusing on the integration of artificial intelligence in educational systems and learning technologies. The event will gather educators, researchers, and AI developers to discuss innovative AI applications transforming education globally.',
 'https://eduai2026.com', 'AI in Education', NULL,
 'Low', 'ai_discovered', 'EDUAI-2026', NULL),

('AIM 2026 - IEEE/ASME International Conference on Advanced Intelligent Mechatronics', 'conference', 'planning',
 '2026-07-07', '2026-07-10', 'Genova, Italy',
 'The AIM2026 IEEE/ASME International Conference on Advanced Intelligent Mechatronics aims to provide an international and global forum for presenting and discussing the latest advances in Advanced Intelligent Mechatronics, covering Sensors and Actuators, Robotics, Human-Robot Interaction, and related fields.',
 NULL, 'IEEE/ASME International Conference on Advanced Intelligent Mechatronics', NULL,
 NULL, 'ai_discovered', 'AIM20-2026-XEKY', NULL),

('Intelligent Systems for Computational Biology Conference', 'conference', 'planning',
 '2026-07-11', '2026-07-15', 'Seattle, WA, USA',
 'ISCB is the flagship conference of the International Society for Computational Biology, focusing on computational methods in molecular biology and bioinformatics. It brings together researchers and practitioners to share the latest advances in algorithms, data integration, and systems biology.',
 'https://www.iscb.org/ismbeccb2026', 'Computational Biology and Bioinformatics', NULL,
 'Low', 'ai_discovered', 'ISCB-2026', NULL),

('Robotics Society of Japan Conference', 'conference', 'planning',
 '2026-07-13', '2026-07-18', 'Seoul, South Korea',
 'RSJ gathers researchers and practitioners in robotics to present research on autonomous systems and automation. The conference features cutting-edge developments in robot perception, planning, and control.',
 'https://roboticsconference.org/2026', 'Robotics & Automation', NULL,
 'Low', 'ai_discovered', 'RSJ-2026', NULL),

('Global Data Science Congress', 'conference', 'planning',
 '2026-07-14', '2026-07-16', 'Dubai, UAE',
 'The Global Data Science Congress 2026 focuses on the latest trends and innovations in data science and artificial intelligence. It attracts academics, professionals, and industry leaders to discuss data-driven AI applications and insights.',
 'https://gdsc2026.com', 'Data Science and AI', NULL,
 'Low', 'ai_discovered', 'GDSC-2026', NULL),

('Generative AI & Models Summit', 'conference', 'planning',
 '2026-07-15', '2026-07-17', 'Zurich, Switzerland',
 'GAMS 2026 is a dedicated symposium focusing on generative AI models and foundational architectures behind AI creativity. The event gathers researchers and industry leaders to discuss breakthroughs and future directions.',
 'https://generativeai-symposium.org', 'Generative AI and Foundation Models', NULL,
 'Low', 'ai_discovered', 'GAMS-2026', NULL),

('AI Applications Summit', 'conference', 'planning',
 '2026-07-21', '2026-07-23', 'Toronto, Canada',
 'The AI Applications Summit showcases practical AI solutions across industries including finance, healthcare, and manufacturing. Attendees include business leaders and AI practitioners discussing AI adoption strategies and innovations.',
 'https://aiasummit.com/2026', 'Applied Artificial Intelligence', NULL,
 'Low', 'ai_discovered', 'AIAS-2026', NULL),

('Ai4 2026', 'conference', 'planning',
 '2026-08-04', '2026-08-06', 'Las Vegas, NV, USA',
 'Ai4 is a major industry event in Las Vegas focusing on the practical application of artificial intelligence. It bridges the gap between technical researchers and business executives across various verticals. The event features hundreds of speakers discussing the current state of business AI.',
 'https://ai4.io', 'Applied AI solutions for multi-industry business transformation', NULL,
 'High', 'ai_discovered', 'AI420-2026-5WX', NULL),

('AI Security Alliance Summit', 'conference', 'planning',
 '2026-08-05', '2026-08-07', 'Washington, D.C., USA',
 'The AI Security Alliance Summit 2026 brings together experts in AI security, privacy, and ethical AI use to discuss challenges and solutions. The event features panels, workshops, and case studies from leading researchers and practitioners.',
 'https://aisecurityalliance.com/summit2026', 'AI Security and Privacy', NULL,
 'Low', 'ai_discovered', 'AISA-2026', NULL),

('AI World Conference & Expo', 'conference', 'planning',
 '2026-08-10', '2026-08-12', 'Boston, MA, USA',
 'AI World Conference & Expo 2026 is a leading event focused on enterprise AI deployment, featuring workshops and keynotes from industry leaders and practitioners. The conference covers AI applications across various sectors including finance, healthcare, and manufacturing.',
 'https://aiworld.com', 'Enterprise AI, Applied AI', NULL,
 'Low', 'ai_discovered', 'AIWC-2026', NULL),

('Global AI Insurance Summit', 'conference', 'planning',
 '2026-08-10', '2026-08-12', 'Zurich, Switzerland',
 'The Global AI in Insurance Summit 2026 focuses on the impact of artificial intelligence in the insurance industry, covering risk assessment, claims automation, and customer experience enhancement. It attracts professionals from finance, AI, and insurance sectors to share insights and innovations.',
 'https://ganiinsurance.org/2026', 'AI in Insurance', NULL,
 'Low', 'ai_discovered', 'GAIIS-2026', NULL),

('IJCAI-ECAI 2026', 'conference', 'planning',
 '2026-08-15', '2026-08-21', 'Bremen, Germany',
 'The International Joint Conference on Artificial Intelligence is a premier gathering for the global AI research community. This edition in Germany features a broad range of technical topics from logic to deep learning. It fosters international cooperation and high-level knowledge exchange in the field.',
 'https://www.ijcai.org', 'Global collaborative research in general artificial intelligence', NULL,
 'Low', 'ai_discovered', 'IJCAI-2026-LUY', NULL),

('International Joint Conference on Artificial Intelligence', 'conference', 'planning',
 '2026-08-17', '2026-08-23', 'Buenos Aires, Argentina',
 'IJCAI is a major international conference presenting research in all areas of artificial intelligence. It serves the global AI community with a broad focus including foundational AI models and algorithms.',
 'https://ijcai.org/2026', 'Foundation Models', NULL,
 'Low', 'ai_discovered', 'IJCAI-2026', NULL),

('AI Expo Africa', 'conference', 'planning',
 '2026-08-18', '2026-08-20', 'Johannesburg, South Africa',
 'AI Expo Africa 2026 highlights AI innovations and deployments across the African continent, bringing together government officials, entrepreneurs, and technology leaders. The event focuses on discussing AI applications, adoption, and challenges unique to Africa, fostering collaboration and growth in the region''s AI ecosystem.',
 'https://www.aiexpoafrica.com', 'AI adoption in Africa, Enterprise AI', NULL,
 'Low', 'ai_discovered', 'AIEA-2026', NULL),

('Hot Chips 2026', 'conference', 'planning',
 '2026-08-23', '2026-08-25', 'Palo Alto, CA, USA',
 'The leading technical conference for high-performance microprocessors and related integrated circuits. This is where companies reveal the deep architectural details of their newest AI accelerators.',
 'https://hotchips.org/', 'High-Performance Chip Architecture, Custom Silicon', NULL,
 NULL, 'ai_discovered', 'HOTCH-2026-DBM', NULL),

('Global AI Summit Africa', 'conference', 'planning',
 '2026-08-25', '2026-08-27', 'Nairobi, Kenya',
 'Global AI Summit Africa 2026 highlights AI innovations and challenges specific to the African continent. The event brings together government officials, entrepreneurs, and tech experts to foster AI ecosystem growth across Africa.',
 'https://gaisa2026.com', 'AI adoption in Africa', NULL,
 'Low', 'ai_discovered', 'GISA-2026', NULL),

('AIiH 2026 - International Conference on AI in Healthcare', 'conference', 'planning',
 '2026-08-26', '2026-08-28', 'Imperial College London, UK',
 'Academic conference hosted at Imperial College London.',
 'https://aiih.cc', 'Ethics of AI in healthcare, predictive analytics, clinical workflows', NULL,
 'Low', 'ai_discovered', 'AIIH2-2026-BCR', NULL),

('Saudi AI & Industry Summit', 'conference', 'planning',
 '2026-09-05', '2026-09-07', 'Seoul, South Korea',
 'SAIIS 2026 is a new symposium dedicated to advancing research and applications in artificial intelligence and intelligent systems. The event brings together academics, industry professionals, and policymakers to discuss emerging trends and AI innovations.',
 'https://saiis2026.org', 'Artificial Intelligence, Intelligent Systems', NULL,
 'Low', 'ai_discovered', 'SAIIS-2026', NULL),

('ECCV 2026', 'conference', 'planning',
 '2026-09-08', '2026-09-13', 'Malmö, Sweden',
 'The European Conference on Computer Vision is a biennial event focusing on all aspects of visual computing. It features workshops, tutorials, and poster sessions showcasing cutting-edge research. ECCV serves as a critical platform for the latest developments in European and global vision science.',
 'https://www.ecva.net', 'European innovations in computer vision and machine intelligence', NULL,
 'High', 'ai_discovered', 'ECCV2-2026-LYG', NULL),

('Intelligent Health 2026', 'conference', 'planning',
 '2026-09-09', '2026-09-10', 'Basel, Switzerland',
 'This summit brings together pharma and clinic worlds with AI tech.',
 'https://intelligenthealth.ai/', 'The world''s leading summit dedicated exclusively to AI in medicine', NULL,
 'High', 'ai_discovered', 'INTEL-2026-XX1', NULL),

('Global MLOps Summit', 'conference', 'planning',
 '2026-09-10', '2026-09-12', 'Berlin, Germany',
 'The Global MLOps Summit 2026 focuses on the operations, deployment, and scalability challenges in machine learning systems. It attracts AI engineers, infrastructure experts, and industry professionals from around the world to share best practices and innovations in MLOps.',
 'https://www.mlopsglobal.com', 'MLOps and AI Infrastructure', NULL,
 'Low', 'ai_discovered', 'GMLOPS-2026', NULL),

('FinAI Conference', 'conference', 'planning',
 '2026-09-10', '2026-09-12', 'London, UK',
 'FinAI Conference is a global forum for discussing AI applications in the financial sector including risk management, fraud detection, and algorithmic trading. Attendees include finance professionals, AI researchers, and regulatory bodies.',
 'https://finai.org/2026', 'AI in Finance', NULL,
 'Low', 'ai_discovered', 'FINAIC-2026', NULL),

('Foundation Models Summit', 'conference', 'planning',
 '2026-09-14', '2026-09-15', 'Online',
 'The Foundation Models Summit 2026 is a virtual event focusing on the latest developments in foundation models and generative AI technologies. The summit features keynotes, panel discussions, and demonstrations from leading industry experts and researchers.',
 'https://foundationmodelssummit.com', 'Foundation Models, Generative AI', NULL,
 'Low', 'ai_discovered', 'FMS-2026', NULL),

('Artificial Intelligence in Healthcare Conference', 'conference', 'planning',
 '2026-09-14', '2026-09-16', 'Boston, MA, USA',
 'AI Healthcare 2026 focuses on advancements in AI technologies applied to healthcare, clinical research, and patient care. The conference gathers experts and innovators to share insights on how AI is transforming healthcare delivery and outcomes.',
 'https://aihealthcareconf.com', 'AI in healthcare technologies and research', NULL,
 'Low', 'ai_discovered', 'AIHC-2026', NULL),

('World Congress on Medical Informatics', 'conference', 'planning',
 '2026-09-14', '2026-09-18', 'Tokyo, Japan',
 'MedInfo is a global conference dedicated to the application of informatics in health and medicine. It serves healthcare professionals, researchers, and AI developers focused on medical AI and health data technologies.',
 'https://medinfo2026.org', 'Medical AI / Healthcare', NULL,
 'Low', 'ai_discovered', 'MEDINFO-2026', NULL),

('AI Infra Summit 2026', 'conference', 'planning',
 '2026-09-15', '2026-09-17', 'Santa Clara, CA, USA',
 'Specifically dedicated to the infrastructure stack for AI, covering everything from training clusters and inference engines to energy efficiency and networking.',
 'https://ai-infra-summit.com/', 'Full-stack AI Infrastructure, Hardware, Systems', NULL,
 NULL, 'ai_discovered', 'AIINF-2026-X0S', NULL),

('AI in Health Conference', 'conference', 'planning',
 '2026-09-15', '2026-09-17', 'Rice University, Houston, TX, USA',
 'Connects the Texas Medical Center ecosystem with global innovators.',
 'https://aihealthconference.com', 'Computational health innovation, algorithms, and data-driven discovery', NULL,
 'High', 'ai_discovered', 'AIINH-2026-X4L', NULL),

('European Conference on Artificial Intelligence', 'conference', 'planning',
 '2026-09-20', '2026-09-25', 'Vienna, Austria',
 'ECAI 2026 is a leading European conference presenting research and developments in artificial intelligence. The event gathers academics and practitioners for presentations, workshops, and networking to advance AI knowledge.',
 'https://ecai2026.org', 'Artificial Intelligence', NULL,
 'Low', 'ai_discovered', 'ECAI-2026', NULL),

('Medical Image Computing and Computer Assisted Intervention', 'conference', 'planning',
 '2026-09-21', '2026-09-25', 'Toronto, Canada',
 'MICCAI focuses on advances in medical image computing and computer-assisted interventions, integrating AI technology for healthcare improvements. It is aimed at researchers, clinicians, and developers in medical AI and imaging.',
 'https://miccai2026.org/', 'Medical AI / Healthcare', NULL,
 'Low', 'ai_discovered', 'MICCAI-2026', NULL),

('Bytes AI Conference', 'conference', 'planning',
 '2026-09-25', '2026-09-26', 'Toronto, Canada',
 'Bytes AI is a conference dedicated to practical applications and impact of AI across industries, with a focus on business transformation and innovation. The event gathers AI professionals, entrepreneurs, and business leaders for sessions, workshops, and networking.',
 'https://bytesai.co', 'Applied Artificial Intelligence', NULL,
 'Low', 'ai_discovered', 'BYTESAI-2026', NULL),

('IROS 2026', 'conference', 'planning',
 '2026-09-27', '2026-10-01', 'Pittsburgh, PA, USA',
 'The International Conference on Intelligent Robots and Systems is one of the largest robotics conferences in the world. It covers theoretical foundations and practical applications of robotic systems and AI. The event highlights the latest in autonomous navigation, manipulation, and human-robot collaboration.',
 'https://www.ieee-ras.org', 'Intelligent robots and human-machine interaction systems', NULL,
 'Low', 'ai_discovered', 'IROS2-2026-W9D', NULL),

('Financial Industry AI Summit', 'conference', 'planning',
 '2026-10-05', '2026-10-07', 'Dubai, UAE',
 'FISC is an international summit focused on the integration of AI technologies in the financial sector. It draws finance professionals, AI developers, and regulators to explore innovation and risk management.',
 'https://fisc2026.org', 'AI in Finance', NULL,
 'Low', 'ai_discovered', 'FISC-2026', NULL),

('World Summit AI', 'conference', 'planning',
 '2026-10-07', '2026-10-08', 'Amsterdam, Netherlands',
 'One of the world''s leading AI events, focusing on the global ecosystem, ethics, and startup innovation.',
 NULL, 'Global AI Ecosystem, Startups', NULL,
 'Medium', 'ai_discovered', 'WORLD-2026-599', NULL),

('World AI Technology Expo', 'trade_show', 'planning',
 '2026-10-07', '2026-10-08', 'Dubai, UAE',
 'The World AI Summit 2026 in Dubai focuses on the ethical challenges and governance frameworks for AI deployment globally. It brings together policymakers, industry leaders, and researchers to discuss innovations and responsible AI practices.',
 'https://worldaiexpo.io/', 'AI governance and ethics', NULL,
 'High', 'ai_discovered', 'WAI-2026', NULL),

('Global AI Developers Summit', 'conference', 'planning',
 '2026-10-10', '2026-10-12', 'San Francisco, USA',
 'The Global AI Developers Summit 2026 focuses on advancements in AI infrastructure, platforms, and tools for developers. It includes workshops, keynote presentations, and networking sessions geared towards improving AI development practices.',
 'https://www.gids2026.com', 'AI Infrastructure and Platform Development', NULL,
 'Low', 'ai_discovered', 'GIDS-2026', NULL),

('China Artificial Intelligence Industry Summit', 'conference', 'planning',
 '2026-10-12', '2026-10-14', 'Paris, France',
 'CAIIS 2026 is a major European conference focusing on the use of AI in industrial applications and societal challenges. The event gathers researchers, industry experts, and policymakers to discuss responsible AI deployment and impact.',
 'https://caiis2026.org', 'Applied Artificial Intelligence', NULL,
 'Low', 'ai_discovered', 'CAIIS-2026', NULL),

('OCP Global Summit 2026', 'conference', 'planning',
 '2026-10-12', '2026-10-15', 'San Jose, CA, USA',
 'The most important event for physical data center infrastructure. Topics include liquid cooling, custom server rack designs, and open standards for interconnects (essential for massive AI clusters).',
 'https://www.opencompute.org/', 'Open Hardware, Data Center Design, Liquid Cooling', NULL,
 NULL, 'ai_discovered', 'OCPGL-2026-7EO', NULL)

ON CONFLICT (external_id) DO NOTHING;

-- 回填 owner_id：将所有 ai_discovered 事件归属到迁移执行人
UPDATE events
SET owner_id = (
  SELECT id FROM auth.users
  WHERE email = 'vivian.xie@onesourcecloud.net'
  LIMIT 1
)
WHERE source = 'ai_discovered' AND owner_id IS NULL;

-- 恢复 owner_id NOT NULL 约束
ALTER TABLE events ALTER COLUMN owner_id SET NOT NULL;

-- ============================================================
-- 插入评论（使用 external_id 关联到新 UUID）
-- 注意：DIGIT-2025-89F 和 NEURIPS-2026 的事件不在导出数据中，
--       对应评论将被跳过（WHERE EXISTS 保护）
-- ============================================================
INSERT INTO event_comments (event_id, author_email, body, created_at)
SELECT e.id, v.author_email, v.body, v.created_at::timestamptz
FROM (VALUES
  ('CES-2026',      'crestpointmarketingllc@gmail.com',
   'CES (Consumer Electronics Show) 是全球规模最大、最具影响力的科技展会，汇聚消费电子、AI、汽车科技与前沿创新，展示未来技术趋势与产业方向。',
   '2026-01-03T06:43:07.642Z'),
  ('HIMSS-2026',    'vivianxie30@gmail.com',
   'We have booth there.',
   '2026-03-04T16:13:17.003Z'),
  ('VIVE-2026',     'vivianxie30@gmail.com',
   'I like this conference and let us prepare for it.',
   '2026-03-23T16:43:47.315Z'),
  ('BIOIT-2026',    'lin.ma@onesourcecloud.net',
   'i will scout the floor on this one.',
   '2026-03-24T03:07:24.581Z'),
  ('GIAC-2026',     'lin.ma@onesourcecloud.net',
   '@ Nazar, please try to arrange a visit to this conference.',
   '2026-03-24T03:15:51.758Z'),
  ('BIOLOGIC-2026', 'lin.ma@onesourcecloud.net',
   'I will scout the floor.',
   '2026-03-24T03:25:08.574Z'),
  ('2026A-2026-WH3','lin.ma@onesourcecloud.net',
   '@ mark, maybe you can take a trip?',
   '2026-03-24T03:34:20.343Z')
) AS v(external_id, author_email, body, created_at)
JOIN events e ON e.external_id = v.external_id;

-- ============================================================
-- 验证
-- ============================================================
SELECT
  (SELECT COUNT(*) FROM events WHERE source = 'ai_discovered') AS imported_events,
  (SELECT COUNT(*) FROM event_comments)                         AS imported_comments;
