DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  first TEXT NOT NULL CHECK (first != ''),
  last TEXT NOT NULL CHECK (last != ''),
  email TEXT NOT NULL UNIQUE CHECK (email != ''),
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TABLE IF EXISTS signatures CASCADE;
      
CREATE TABLE signatures (
  id SERIAL PRIMARY KEY,
  signature TEXT NOT NULL CHECK (signature != ''),
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TABLE IF EXISTS user_profiles CASCADE;

CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    age INT,
    city TEXT,
    url TEXT,
    user_id INT NOT NULL REFERENCES users(id) UNIQUE 
);

