-- Recreate the application schema from empty state, then seed products only.
PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS account;
DROP TABLE IF EXISTS session;
DROP TABLE IF EXISTS verification;
DROP TABLE IF EXISTS "user";
DROP TABLE IF EXISTS legacy_order_items;
DROP TABLE IF EXISTS legacy_orders;
DROP TABLE IF EXISTS legacy_email_verification_tokens;
DROP TABLE IF EXISTS legacy_password_reset_tokens;
DROP TABLE IF EXISTS legacy_sessions;
DROP TABLE IF EXISTS legacy_users;
DROP TABLE IF EXISTS email_verification_tokens;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS rate_limits;

CREATE TABLE "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE session (
  id TEXT PRIMARY KEY,
  expiresAt INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX idx_session_userId ON session(userId);

CREATE TABLE account (
  id TEXT PRIMARY KEY,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt INTEGER,
  refreshTokenExpiresAt INTEGER,
  scope TEXT,
  password TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX idx_account_userId ON account(userId);

CREATE TABLE verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX idx_verification_identifier ON verification(identifier);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(active);

INSERT INTO products (id, slug, name, description, category, price_cents, stock, image_url, created_at) VALUES
-- Original Luxury Items
('prod_lv_neverfull', 'lv-neverfull', 'LV Neverfull MM', 'Timeless Monogram canvas tote with gold-tone hardware.', 'Bags', 850000, 12, '/assets/images/products/lv-neverfull.png', CURRENT_TIMESTAMP),
('prod_dior_lady', 'dior-lady', 'Dior Lady Dior', 'Iconic quilted Cannage lambskin with elegant DIOR charms.', 'Bags', 2500000, 8, '/assets/images/products/dior-lady.png', CURRENT_TIMESTAMP),
('prod_chanel_flap', 'chanel-flap', 'Chanel Classic Flap', 'Exquisite quilted caviar leather with the signature CC turn-lock.', 'Bags', 4500000, 5, '/assets/images/products/chanel-flap.png', CURRENT_TIMESTAMP),
('prod_hermes_birkin', 'hermes-birkin', 'Hermès Birkin 30', 'The ultimate luxury handbag crafted in premium Togo leather.', 'Bags', 11000000, 2, '/assets/images/products/hermes-birkin.png', CURRENT_TIMESTAMP),
('prod_rolex_submariner', 'rolex-submariner', 'Rolex Submariner', 'The quintessential divers watch in Oystersteel.', 'Watches', 4250000, 4, '/assets/images/products/rolex-submariner.png', CURRENT_TIMESTAMP),
('prod_rolex_datejust', 'rolex-datejust', 'Rolex Datejust 36', 'Classic Oystersteel and yellow gold with a fluted bezel.', 'Watches', 5500000, 3, '/assets/images/products/rolex-datejust.png', CURRENT_TIMESTAMP),
('prod_cartier_tank', 'cartier-tank', 'Cartier Tank Française', 'A masterpiece of modern design with a seamless chain-link bracelet.', 'Watches', 1820000, 6, '/assets/images/products/cartier-tank.png', CURRENT_TIMESTAMP),
('prod_apm_meteorites', 'apm-meteorites', 'APM Monaco Meteorites', 'Sterling silver open bangle handset with micro-pavé zirconia.', 'Bangles', 120000, 15, '/assets/images/products/apm-meteorites.png', CURRENT_TIMESTAMP),
('prod_cartier_love', 'cartier-love', 'Cartier LOVE Bracelet', 'An iconic symbol of love in 18K yellow gold.', 'Bangles', 3250000, 7, '/assets/images/products/cartier-love.png', CURRENT_TIMESTAMP),
('prod_vca_alhambra', 'vca-alhambra', 'Van Cleef Alhambra', 'Vintage Alhambra necklace featuring a luminous mother-of-pearl clover.', 'Necklaces', 1280000, 9, '/assets/images/products/vca-alhambra.png', CURRENT_TIMESTAMP),
('prod_tiffany_smile', 'tiffany-smile', 'Tiffany T Smile', 'Elegant 18k rose gold pendant with brilliant round diamonds.', 'Necklaces', 1450000, 11, '/assets/images/products/tiffany-smile.png', CURRENT_TIMESTAMP),
('prod_bvlgari_bzero1', 'bvlgari-bzero1', 'Bvlgari B.zero1', 'Striking 18 kt rose gold pendant inspired by the Colosseum.', 'Necklaces', 1690000, 6, '/assets/images/products/bvlgari-bzero1.png', CURRENT_TIMESTAMP),

-- First Expansion (24 items)
('prod_bottega_jodie', 'bottega-jodie', 'Bottega Veneta Mini Jodie', 'Intrecciato leather top handle bag with a signature knotted strap.', 'Bags', 265000, 14, '/assets/images/products/bottega-jodie.png', CURRENT_TIMESTAMP),
('prod_ysl_kate', 'ysl-kate', 'YSL Kate Medium', 'Classic grain de poudre leather shoulder bag with gold-toned Cassandre hardware.', 'Bags', 235000, 9, '/assets/images/products/ysl-kate.png', CURRENT_TIMESTAMP),
('prod_celine_triomphe', 'celine-triomphe', 'Celine Classique Triomphe', 'Shiny calfskin leather featuring the iconic metallic Triomphe closure.', 'Bags', 415000, 6, '/assets/images/products/celine-triomphe.png', CURRENT_TIMESTAMP),
('prod_prada_cleo', 'prada-cleo', 'Prada Cleo Brushed Leather', 'Sleek, minimalist curved shoulder bag featuring the enamel triangle logo.', 'Bags', 285000, 11, '/assets/images/products/prada-cleo.png', CURRENT_TIMESTAMP),
('prod_gucci_jackie', 'gucci-jackie', 'Gucci Jackie 1961', 'The iconic hobo bag in GG Supreme canvas with a piston closure.', 'Bags', 295000, 8, '/assets/images/products/gucci-jackie.png', CURRENT_TIMESTAMP),
('prod_loewe_puzzle', 'loewe-puzzle', 'Loewe Small Puzzle Bag', 'Innovative cuboid shape crafted from precise geometric leather cuts.', 'Bags', 345000, 5, '/assets/images/products/loewe-puzzle.png', CURRENT_TIMESTAMP),
('prod_omega_speedmaster', 'omega-speedmaster', 'Omega Speedmaster Professional', 'The legendary Moonwatch featuring a black step dial and chronograph.', 'Watches', 700000, 7, '/assets/images/products/omega-speedmaster.png', CURRENT_TIMESTAMP),
('prod_patek_nautilus', 'patek-nautilus', 'Patek Philippe Nautilus 5711', 'The holy grail of steel sports watches with a horizontal embossed dial.', 'Watches', 14500000, 1, '/assets/images/products/patek-nautilus.png', CURRENT_TIMESTAMP),
('prod_ap_royaloak', 'ap-royaloak', 'Audemars Piguet Royal Oak', 'Iconic octagonal bezel with visible screws and Grande Tapisserie dial.', 'Watches', 6500000, 2, '/assets/images/products/ap-royaloak.png', CURRENT_TIMESTAMP),
('prod_cartier_santos', 'cartier-santos', 'Cartier Santos Medium', 'Historic square-cased aviator watch in stainless steel with Roman numerals.', 'Watches', 680000, 8, '/assets/images/products/cartier-santos.png', CURRENT_TIMESTAMP),
('prod_tudor_blackbay', 'tudor-blackbay', 'Tudor Black Bay 58', 'Vintage-inspired 39mm dive watch with gilt dial accents.', 'Watches', 390000, 12, '/assets/images/products/tudor-blackbay.png', CURRENT_TIMESTAMP),
('prod_iwc_portugieser', 'iwc-portugieser', 'IWC Portugieser Chronograph', 'Elegant dress chronograph with applied Arabic numerals and leaf hands.', 'Watches', 840000, 5, '/assets/images/products/iwc-portugieser.png', CURRENT_TIMESTAMP),
('prod_cartier_juste', 'cartier-juste', 'Cartier Juste un Clou', 'Audacious 18K rose gold bangle inspired by a simple nail.', 'Bangles', 345000, 9, '/assets/images/products/cartier-juste.png', CURRENT_TIMESTAMP),
('prod_bvlgari_serpenti', 'bvlgari-serpenti', 'Bvlgari Serpenti Viper', 'Mesmerizing 18K white gold bracelet mimicking the scales of a serpent.', 'Bangles', 560000, 4, '/assets/images/products/bvlgari-serpenti.png', CURRENT_TIMESTAMP),
('prod_tiffany_lock', 'tiffany-lock', 'Tiffany Lock Bangle', 'An expression of unity in 18K yellow and white gold with diamonds.', 'Bangles', 690000, 6, '/assets/images/products/tiffany-lock.png', CURRENT_TIMESTAMP),
('prod_chaumet_bee', 'chaumet-bee', 'Chaumet Bee My Love', 'Graphic honeycomb geometry in 18K pink gold with brilliant-cut diamonds.', 'Bangles', 485000, 7, '/assets/images/products/chaumet-bee.png', CURRENT_TIMESTAMP),
('prod_messika_move', 'messika-move', 'Messika Move Uno', 'Sleek gold bangle featuring a signature rolling diamond in a cage.', 'Bangles', 215000, 12, '/assets/images/products/messika-move.png', CURRENT_TIMESTAMP),
('prod_chopard_ice', 'chopard-ice', 'Chopard Ice Cube Bangle', 'Ethical 18K rose gold faceted into perfectly geometric ice cubes.', 'Bangles', 195000, 10, '/assets/images/products/chopard-ice.png', CURRENT_TIMESTAMP),
('prod_vca_sweet', 'vca-sweet', 'Van Cleef Sweet Alhambra', 'Delicate necklace featuring a miniature onyx clover motif.', 'Necklaces', 165000, 14, '/assets/images/products/vca-sweet.png', CURRENT_TIMESTAMP),
('prod_tiffany_hardwear', 'tiffany-hardwear', 'Tiffany HardWear Graduated', 'Bold gauge links in 18K gold capturing the spirit of New York City.', 'Necklaces', 2450000, 3, '/assets/images/products/tiffany-hardwear.png', CURRENT_TIMESTAMP),
('prod_bvlgari_divas', 'bvlgari-divas', 'Bvlgari Divas’ Dream', 'Fan-shaped malachite pendant paying homage to Roman mosaics.', 'Necklaces', 225000, 8, '/assets/images/products/bvlgari-divas.png', CURRENT_TIMESTAMP),
('prod_cartier_trinity', 'cartier-trinity', 'Cartier Trinity Necklace', 'Three intertwined rings of yellow, white, and rose gold.', 'Necklaces', 145000, 15, '/assets/images/products/cartier-trinity.png', CURRENT_TIMESTAMP),
('prod_piaget_possession', 'piaget-possession', 'Piaget Possession Pendant', 'Playful rotating gold ring set with a brilliant diamond and carnelian.', 'Necklaces', 275000, 6, '/assets/images/products/piaget-possession.png', CURRENT_TIMESTAMP),
('prod_messika_baby', 'messika-baby', 'Messika Baby Move', 'Three moving diamonds symbolizing yesterday, today, and tomorrow.', 'Necklaces', 315000, 9, '/assets/images/products/messika-baby.png', CURRENT_TIMESTAMP),

-- Second Expansion (60 items)
('prod_celine_belt', 'celine-belt', 'Celine Nano Belt Bag', 'Supple grained calfskin featuring distinctive knotted belt leather details.', 'Bags', 2700000, 7, '/assets/images/products/celine-belt.png', CURRENT_TIMESTAMP),
('prod_gucci_dionysus', 'gucci-dionysus', 'Gucci Dionysus GG Supreme', 'Structured shoulder bag highlighted by a textured tiger head horseshoe closure.', 'Bags', 2900000, 5, '/assets/images/products/gucci-dionysus.png', CURRENT_TIMESTAMP),
('prod_fendi_baguette', 'fendi-baguette', 'Fendi Zucca Baguette', 'Iconic archival shoulder bag crafted in tobacco jacquard fabric with FF hardware.', 'Bags', 3100000, 4, '/assets/images/products/fendi-baguette.png', CURRENT_TIMESTAMP),
('prod_chloe_woody', 'chloe-woody', 'Chloé Woody Tote', 'Cotton canvas shopper tote accented with branded leather logo ribbon strips.', 'Bags', 1150000, 15, '/assets/images/products/chloe-woody.png', CURRENT_TIMESTAMP),
('prod_balenciaga_hourglass', 'balenciaga-hourglass', 'Balenciaga Hourglass XS', 'Curved sculptural top handle bag featuring metallic B logo hardware.', 'Bags', 2550000, 6, '/assets/images/products/balenciaga-hourglass.png', CURRENT_TIMESTAMP),
('prod_valentino_rockstud', 'valentino-rockstud', 'Valentino Garavani Rockstud', 'Supple calfskin crossbody adorned with signature pyramid metal studs.', 'Bags', 2400000, 8, '/assets/images/products/valentino-rockstud.png', CURRENT_TIMESTAMP),
('prod_givenchy_antigona', 'givenchy-antigona', 'Givenchy Antigona Mini', 'Structured architectural duffel bag crafted in smooth box calfskin.', 'Bags', 2250000, 9, '/assets/images/products/givenchy-antigona.png', CURRENT_TIMESTAMP),
('prod_salvatore_studio', 'salvatore-studio', 'Ferragamo Studio Box', 'Clean-lined structured leather tote featuring a Gancini push-lock closure.', 'Bags', 2800000, 5, '/assets/images/products/salvatore-studio.png', CURRENT_TIMESTAMP),
('prod_burberry_lola', 'burberry-lola', 'Burberry Lola Quilted', 'Soft lambskin shoulder bag quilted with check patterns and polished TB clasp.', 'Bags', 2100000, 10, '/assets/images/products/burberry-lola.png', CURRENT_TIMESTAMP),
('prod_mulberry_bayswater', 'mulberry-bayswater', 'Mulberry Classic Bayswater', 'Quintessential British heritage tote featuring the iconic postman lock.', 'Bags', 1650000, 11, '/assets/images/products/mulberry-bayswater.png', CURRENT_TIMESTAMP),
('prod_jacquemus_chiquito', 'jacquemus-chiquito', 'Jacquemus Le Chiquito', 'Structured micro top handle bag with bold structural metal lettering.', 'Bags', 950000, 14, '/assets/images/products/jacquemus-chiquito.png', CURRENT_TIMESTAMP),
('prod_alexander_mcqueen_skull', 'alexander-mcqueen-skull', 'McQueen Jewelled Satchel', 'Box calfskin bag finished with an ornately crystal-encrusted four-ring handle.', 'Bags', 2950000, 3, '/assets/images/products/alexander-mcqueen-skull.png', CURRENT_TIMESTAMP),
('prod_staud_moon', 'staud-moon', 'Staud Moon Leather Bag', 'Distinctive crescent-shaped leather shoulder bag with a structured silhouette.', 'Bags', 450000, 18, '/assets/images/products/staud-moon.png', CURRENT_TIMESTAMP),
('prod_mansur_gavriel_bucket', 'mansur-gavriel-bucket', 'Mansur Gavriel Everyday Bucket', 'Minimalist Italian vegetable-tanned leather bucket bag with contrasting interior.', 'Bags', 790000, 12, '/assets/images/products/mansur-gavriel-bucket.png', CURRENT_TIMESTAMP),
('prod_proenza_ps1', 'proenza-ps1', 'Proenza Schouler PS1 Tiny', 'Soft leather satchel inspired by traditional school messenger bags.', 'Bags', 1450000, 7, '/assets/images/products/proenza-ps1.png', CURRENT_TIMESTAMP),
('prod_tag_heuer_monaco', 'tag-heuer-monaco', 'TAG Heuer Monaco Chronograph', 'Iconic square-dial racing automatic watch famously worn by Steve McQueen.', 'Watches', 7200000, 4, '/assets/images/products/tag-heuer-monaco.png', CURRENT_TIMESTAMP),
('prod_breitling_navitimer', 'breitling-navitimer', 'Breitling Navitimer B01', 'Legendary aviation chronograph featuring a circular slide rule bezel.', 'Watches', 9100000, 3, '/assets/images/products/breitling-navitimer.png', CURRENT_TIMESTAMP),
('prod_grand_seiko_snowflake', 'grand-seiko-snowflake', 'Grand Seiko Snowflake', 'Spring Drive movement paired with a textured white dial mimicking winter snow.', 'Watches', 6300000, 6, '/assets/images/products/grand-seiko-snowflake.png', CURRENT_TIMESTAMP),
('prod_panerai_luminor', 'panerai-luminor', 'Panerai Luminor Marina', 'Robust cushion-shaped case equipped with a crown-protection bridge device.', 'Watches', 8700000, 3, '/assets/images/products/panerai-luminor.png', CURRENT_TIMESTAMP),
('prod_zenith_el_primero', 'zenith-el_primero', 'Zenith Chronomaster Sport', 'High-frequency chronograph movement with striking tricolor subdials.', 'Watches', 10500000, 2, '/assets/images/products/zenith-el_primero.png', CURRENT_TIMESTAMP),
('prod_jaeger_lecoultre_reverso', 'jaeger-lecoultre-reverso', 'JLC Reverso Classic', 'Art Deco rectangular reversible case designed for polo players.', 'Watches', 9800000, 4, '/assets/images/products/jaeger-lecoultre-reverso.png', CURRENT_TIMESTAMP),
('prod_hublot_bigbang', 'hublot-bigbang', 'Hublot Big Bang Unico', 'Fusion-styled titanium case featuring an openworked skeleton dial.', 'Watches', 18500000, 2, '/assets/images/products/hublot-bigbang.png', CURRENT_TIMESTAMP),
('prod_longines_spirit', 'longines-spirit', 'Longines Spirit Zulu Time', 'Precision pilot watch equipped with a ceramic GMT bezel and chronometer certification.', 'Watches', 3100000, 9, '/assets/images/products/longines-spirit.png', CURRENT_TIMESTAMP),
('prod_tissot_prx', 'tissot-prx', 'Tissot PRX Powermatic 80', 'Integrated-bracelet sports watch with a stunning waffle-patterned dial.', 'Watches', 750000, 20, '/assets/images/products/tissot-prx.png', CURRENT_TIMESTAMP),
('prod_oris_diver', 'oris-diver', 'Oris Divers Sixty-Five', 'Retro-styled mechanical dive watch with curved sapphire crystal and tropical strap.', 'Watches', 2400000, 11, '/assets/images/products/oris-diver.png', CURRENT_TIMESTAMP),
('prod_hamilton_murph', 'hamilton-murph', 'Hamilton Khaki Field Murph', 'Cinematic military field watch featuring vintage cathedral hands.', 'Watches', 1150000, 14, '/assets/images/products/hamilton-murph.png', CURRENT_TIMESTAMP),
('prod_seiko_prospex', 'seiko-prospex', 'Seiko Prospex "Captain Willard"', 'Tortoise-cased automatic professional diver watch built for extreme conditions.', 'Watches', 1400000, 13, '/assets/images/products/seiko-prospex.png', CURRENT_TIMESTAMP),
('prod_baume_mercier_clifton', 'baume-mercier-clifton', 'Baume & Mercier Clifton Baumatic', 'Sophisticated dress watch boasting an exceptional 5-day power reserve.', 'Watches', 3800000, 5, '/assets/images/products/baume-mercier-clifton.png', CURRENT_TIMESTAMP),
('prod_rado_captain', 'rado-captain', 'Rado Captain Cook High-Tech', 'Scratchproof ceramic dive watch with a captivating translucent gradient dial.', 'Watches', 3500000, 6, '/assets/images/products/rado-captain.png', CURRENT_TIMESTAMP),
('prod_nomos_tangente', 'nomos-tangente', 'Nomos Glashütte Tangente 38', 'Bauhaus-inspired minimalist dress watch featuring tempered blue steel hands.', 'Watches', 2600000, 8, '/assets/images/products/nomos-tangente.png', CURRENT_TIMESTAMP),
('prod_david_yurman_cable', 'david-yurman-cable', 'David Yurman Cable Classics', 'Sterling silver and 14K yellow gold helix bracelet capped with pavé diamonds.', 'Bangles', 980000, 16, '/assets/images/products/david-yurman-cable.png', CURRENT_TIMESTAMP),
('prod_john_hardy_legends', 'john-hardy-legends', 'John Hardy Naga Dragon Bangle', 'Hand-carved sterling silver dragon motif featuring sapphire eyes.', 'Bangles', 1250000, 10, '/assets/images/products/john-hardy-legends.png', CURRENT_TIMESTAMP),
('prod_roberto_coin_romano', 'roberto-coin-romano', 'Roberto Coin Princess Flower', '18K yellow gold open floral patterned cuff hiding a signature embedded ruby.', 'Bangles', 3800000, 5, '/assets/images/products/roberto-coin-romano.png', CURRENT_TIMESTAMP),
('prod_pomellato_nudo', 'pomellato-nudo', 'Pomellato M’ama non M’ama', 'Minimalist rose gold bangle topped with a cabochon-cut london blue topaz.', 'Bangles', 2100000, 7, '/assets/images/products/pomellato-nudo.png', CURRENT_TIMESTAMP),
('prod_buccellati_opera', 'buccellati-opera', 'Buccellati Opera Tulle', 'Lace-textured 18K yellow gold cuff crafted using intricate artisan engraving.', 'Bangles', 6500000, 2, '/assets/images/products/buccellati-opera.png', CURRENT_TIMESTAMP),
('prod_stephen_webster_ray', 'stephen-webster-ray', 'Stephen Webster Ray Fish Cuff', 'Edgy architectural silver cuff inlaid with vibrant neon enamel colorways.', 'Bangles', 1850000, 4, '/assets/images/products/stephen-webster-ray.png', CURRENT_TIMESTAMP),
('prod_georg_jensen_offspring', 'georg-jensen-offspring', 'Georg Jensen Offspring Bangle', 'Interlocked organic silver loops symbolizing the unbreakable bond of family.', 'Bangles', 620000, 12, '/assets/images/products/georg-jensen-offspring.png', CURRENT_TIMESTAMP),
('prod_tiffany_bone', 'tiffany-bone', 'Tiffany & Co. Elsa Peretti Bone', 'Contoured ergonomic cuff molded to conform naturally to the wrist bone.', 'Bangles', 1800000, 8, '/assets/images/products/tiffany-bone.png', CURRENT_TIMESTAMP),
('prod_swarovski_millenia', 'swarovski-millenia', 'Swarovski Millenia Octagon Bangle', 'Vibrant emerald-cut green crystal pavé band set in a polished rhodium finish.', 'Bangles', 350000, 25, '/assets/images/products/swarovski-millenia.png', CURRENT_TIMESTAMP),
('prod_apm_monaco_jetset', 'apm-monaco-jetset', 'APM Monaco Chic Bangle', 'Adjustable sterling silver sliding bracelet encrusted with sparkling white zirconia.', 'Bangles', 410000, 15, '/assets/images/products/apm-monaco-jetset.png', CURRENT_TIMESTAMP),
('prod_links_of_london_sweetie', 'links-of-london-sweetie', 'Links Sterling Silverador', 'Flexible modular charm foundation band constructed from solid silver links.', 'Bangles', 550000, 9, '/assets/images/products/links-of-london-sweetie.png', CURRENT_TIMESTAMP),
('prod_fondation_cartier_cuff', 'fondation-cartier-cuff', 'Cartier Panthère de Cartier', 'Sculptural panther head terminal cuff finished in fine yellow gold and onyx.', 'Bangles', 14500000, 1, '/assets/images/products/fondation-cartier-cuff.png', CURRENT_TIMESTAMP),
('prod_ikepod_hemisphere', 'ikepod-hemisphere', 'Paspaley Mother of Pearl Cuff', 'Sleek structural titanium cuff inset with luminous Australian South Sea pearl elements.', 'Bangles', 4200000, 3, '/assets/images/products/ikepod-hemisphere.png', CURRENT_TIMESTAMP),
('prod_tous_bearer', 'tous-bearer', 'TOUS Bear Motif Bangle', 'Playful 18K vermeil gold cuff featuring the signature outline bear emblem.', 'Bangles', 490000, 14, '/assets/images/products/tous-bearer.png', CURRENT_TIMESTAMP),
('prod_missoma_claw', 'missoma-claw', 'Missoma Harris Reed In Good Hands', 'Chunky statement gold vermeil cuff detailed with clasped hand motifs.', 'Bangles', 310000, 19, '/assets/images/products/missoma-claw.png', CURRENT_TIMESTAMP),
('prod_tiffany_key', 'tiffany-key', 'Tiffany & Co. Victoria Key', 'Platinum pendant necklace set with marquise-cut and round brilliant diamonds.', 'Necklaces', 3900000, 5, '/assets/images/products/tiffany-key.png', CURRENT_TIMESTAMP),
('prod_vca_magic', 'vca-magic', 'Van Cleef Magic Alhambra Long', 'Asymmetrical mother-of-pearl and onyx clover stations along a yellow gold chain.', 'Necklaces', 7400000, 2, '/assets/images/products/vca-magic.png', CURRENT_TIMESTAMP),
('prod_cartier_amulette', 'cartier-amulette', 'Cartier Amulette de Cartier', 'Padlock talisman pendant crafted in lapis lazuli and glittering diamond pavé.', 'Necklaces', 4600000, 4, '/assets/images/products/cartier-amulette.png', CURRENT_TIMESTAMP),
('prod_chopard_happy', 'chopard-happy', 'Chopard Happy Diamonds Icons', 'Floating free-moving diamond encased inside a sapphire crystal circle pendant.', 'Necklaces', 3200000, 6, '/assets/images/products/chopard-happy.png', CURRENT_TIMESTAMP),
('prod_bulgari_monete', 'bulgari-monete', 'Bulgari Monete Ancient Coin', 'Historical antique silver coin mounted inside an 18K yellow gold architectural frame.', 'Necklaces', 12500000, 1, '/assets/images/products/bulgari-monete.png', CURRENT_TIMESTAMP),
('prod_messika_gatsby', 'messika-gatsby', 'Messika Gatsby Bar Necklace', 'Horizontal linear bar entirely paved with shimmering modern round diamonds.', 'Necklaces', 2800000, 7, '/assets/images/products/messika-gatsby.png', CURRENT_TIMESTAMP),
('prod_david_yurman_renaissance', 'david-yurman-renaissance', 'David Yurman Renaissance', 'Sculptural cable-core amulet accented with vibrant rubies and yellow sapphires.', 'Necklaces', 2150000, 8, '/assets/images/products/david-yurman-renaissance.png', CURRENT_TIMESTAMP),
('prod_roberto_coin_centoventi', 'roberto-coin-centoventi', 'Roberto Coin Venetian Princess', 'Openwork geometric floral medallion pendant crafted in textured 18K gold.', 'Necklaces', 2900000, 5, '/assets/images/products/roberto-coin-centoventi.png', CURRENT_TIMESTAMP),
('prod_apm_monaco_yummy', 'apm-monaco-yummy', 'APM Monaco Yummy Lariat', 'Daring drop lariat necklace studded with multicolored micro-pavé crystals.', 'Necklaces', 520000, 16, '/assets/images/products/apm-monaco-yummy.png', CURRENT_TIMESTAMP),
('prod_swarovski_constella', 'swarovski-constella', 'Swarovski Constella Choker', 'Brilliant galaxy-inspired crystal stones linked together via delicate rose-gold tone prongs.', 'Necklaces', 440000, 22, '/assets/images/products/swarovski-constella.png', CURRENT_TIMESTAMP),
('prod_tiffany_soleste', 'tiffany-soleste', 'Tiffany Soleste Pear Pendant', 'Dazzling pear-shaped fancy yellow diamond encircled by a double row of white diamonds.', 'Necklaces', 9500000, 2, '/assets/images/products/tiffany-soleste.png', CURRENT_TIMESTAMP),
('prod_gorjana_bali', 'gorjana-bali', 'Gorjana Parker Layering Set', 'Pre-styled multi-chain combination crafted in 18K gold plated brass.', 'Necklaces', 180000, 30, '/assets/images/products/gorjana-bali.png', CURRENT_TIMESTAMP),
('prod_astley_clarke_biography', 'astley-clarke-biography', 'Astley Clarke Stilla Locket', 'Enamel-faced gold locket necklace designed to hold miniature keepsake photos.', 'Necklaces', 350000, 14, '/assets/images/products/astley-clarke-biography.png', CURRENT_TIMESTAMP),
('prod_mejuri_solo', 'mejuri-solo', 'Mejuri Diamond Line Necklace', 'Sleek minimalist solid 14K yellow gold chain inset with evenly spaced bezel diamonds.', 'Necklaces', 690000, 18, '/assets/images/products/mejuri-solo.png', CURRENT_TIMESTAMP),
('prod_monica_vinader_siren', 'monica-vinader-siren', 'Monica Vinader Siren Muse', 'Organic irregular gemstone pendant suspended from a fine adjustable chain.', 'Necklaces', 250000, 20, '/assets/images/products/monica-vinader-siren.png', CURRENT_TIMESTAMP);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id),
  status TEXT NOT NULL,
  subtotal_cents INTEGER NOT NULL,
  shipping_cents INTEGER NOT NULL,
  tax_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  shipping_name TEXT NOT NULL,
  address1 TEXT NOT NULL,
  address2 TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_orders_user_idempotency ON orders(user_id, idempotency_key);
CREATE INDEX idx_orders_user ON orders(user_id);

CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

CREATE TABLE rate_limits (
  key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (key, window_start)
);

PRAGMA foreign_keys = ON;