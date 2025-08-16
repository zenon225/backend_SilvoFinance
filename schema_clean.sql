-- Création du schéma
CREATE SCHEMA IF NOT EXISTS public;
COMMENT ON SCHEMA public IS 'standard public schema';

-- Table admins
CREATE TABLE public.admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table users
CREATE TABLE public.users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash TEXT NOT NULL,
    balance NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT false,
    total_earnings NUMERIC(12,2) DEFAULT 0,
    referral_earnings NUMERIC(12,2) DEFAULT 0
);

-- Table investment_packs
CREATE TABLE public.investment_packs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    min_amount NUMERIC(10,2) NOT NULL,
    max_amount NUMERIC(10,2),
    interest_rate NUMERIC(5,2) NOT NULL,
    duration_days INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    return_percentage_40_days DOUBLE PRECISION DEFAULT 0
);

-- Table investments
CREATE TABLE public.investments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    pack_id INTEGER REFERENCES public.investment_packs(id),
    amount NUMERIC(10,2) NOT NULL,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    expected_return NUMERIC(12,2),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hourly_payout NUMERIC(15,2) DEFAULT 0.00,
    remaining_hours INTEGER DEFAULT 0,
    total_hours INTEGER DEFAULT 0,
    next_payout TIMESTAMP
);

-- Table earnings
CREATE TABLE public.earnings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id),
    id_invest INTEGER NOT NULL REFERENCES public.investments(id),
    montant_total NUMERIC(15,2) NOT NULL,
    retour_gain NUMERIC(15,2) DEFAULT 0.00,
    gain_disponible NUMERIC(15,2) DEFAULT 0.00,
    gain_recolte NUMERIC(15,2) DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table referrals
CREATE TABLE public.referrals (
    id SERIAL PRIMARY KEY,
    referrer_id INTEGER REFERENCES public.users(id),
    referred_id INTEGER REFERENCES public.users(id),
    bonus NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table referral_levels
CREATE TABLE public.referral_levels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE,
    min_referrals INTEGER NOT NULL,
    max_referrals INTEGER,
    commission_rate NUMERIC(5,2) NOT NULL,
    description TEXT
);

-- Table notifications
CREATE TABLE public.notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table settings
CREATE TABLE public.settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table site_infos
CREATE TABLE public.site_infos (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table testimonials
CREATE TABLE public.testimonials (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    name VARCHAR(100),
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table transactions
CREATE TABLE public.transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(10) CHECK (type IN ('deposit', 'withdraw')),
    amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_method VARCHAR(50),
    reference_code VARCHAR(100)
);

-- Table chatbot_messages
CREATE TABLE public.chatbot_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    response TEXT,
    sender VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'bot')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table packs (alternative aux investment_packs)
CREATE TABLE public.packs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    daily_return NUMERIC(5,2) NOT NULL,
    duration_days INTEGER NOT NULL,
    min_amount NUMERIC(15,2) NOT NULL
);

-- Insertion des données de référence pour referral_levels
INSERT INTO public.referral_levels (id, name, min_referrals, max_referrals, commission_rate, description) VALUES
(1, 'Bronze', 1, 10, 8.00, 'Niveau Bronze : 8% de commission pour 1 à 10 parrainages'),
(2, 'Argent', 11, 20, 10.00, 'Niveau Argent : 10% de commission pour 11 à 20 parrainages'),
(3, 'Or', 21, 49, 12.00, 'Niveau Or : 12% de commission pour 21 à 49 parrainages'),
(4, 'Platine', 50, NULL, 15.00, 'Niveau Platine : 15% de commission pour 50 parrainages et plus');

-- Insertion des paramètres par défaut
INSERT INTO public.settings (id, key, value, updated_at) VALUES
(1, 'referral_bonus_percentage', '5', '2025-07-10 00:08:14.362419'),
(2, 'minimum_withdrawal', '10', '2025-07-10 00:08:14.362419'),
(3, 'daily_interest_limit', '20', '2025-07-10 00:08:14.362419');

-- Insertion des infos du site
INSERT INTO public.site_infos (id, key, value, updated_at) VALUES
(1, 'about', 'Nous sommes une plateforme d''investissement sécurisée offrant divers packs adaptés à tous les budgets.', '2025-07-10 00:08:29.841462'),
(2, 'email_contact', 'support@tonsite.com', '2025-07-10 00:08:29.841462'),
(3, 'phone_contact', '+2250700000000', '2025-07-10 00:08:29.841462'),
(4, 'whatsapp_contact', '+2250700000000', '2025-07-10 00:08:29.841462'),
(5, 'facebook_link', 'https://facebook.com/tonsite', '2025-07-10 00:08:29.841462'),
(6, 'instagram_link', 'https://instagram.com/tonsite', '2025-07-10 00:08:29.841462'),
(7, 'twitter_link', 'https://twitter.com/tonsite', '2025-07-10 00:08:29.841462'),
(8, 'linkedin_link', 'https://linkedin.com/company/tonsite', '2025-07-10 00:08:29.841462'),
(9, 'terms_of_service', 'Lien ou contenu des conditions d''utilisation...', '2025-07-10 00:08:29.841462'),
(10, 'privacy_policy', 'Lien ou contenu de la politique de confidentialité...', '2025-07-10 00:08:29.841462');

-- Insertion des packs d'investissement
INSERT INTO public.investment_packs (id, name, description, min_amount, max_amount, interest_rate, duration_days, is_active, created_at, return_percentage_40_days) VALUES
(1, 'Mini Starter', 'Pack idéal pour débuter avec un petit budget', 10000.00, 49999.00, 2.50, 40, true, '2025-07-19 22:29:37.990675', 100),
(2, 'Pack Croissance', 'Pack standard avec bon rendement', 50000.00, 199999.00, 2.75, 40, true, '2025-07-19 22:29:37.990675', 110),
(3, 'Starter', 'Pack intermédiaire pour croissance régulière', 200000.00, 499999.00, 3.00, 40, true, '2025-07-19 22:29:37.990675', 120),
(4, 'Essentiel', 'Pack essentiel pour investisseurs sérieux', 500000.00, 1499999.00, 3.25, 40, true, '2025-07-19 22:29:37.990675', 130),
(5, 'Business', 'Pack professionnel pour investissements conséquents', 1500000.00, 10000000.00, 3.50, 40, true, '2025-07-19 22:29:37.990675', 140);