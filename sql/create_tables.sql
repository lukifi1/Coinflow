CREATE OR REPLACE PROCEDURE public.create_tables() 
LANGUAGE SQL
AS $$
	DROP TABLE IF EXISTS users;
	
	CREATE TABLE IF NOT EXISTS users (
		-- What a uuid is: https://datatracker.ietf.org/doc/html/rfc4122 https://www.postgresql.org/docs/current/datatype-uuid.html
		-- gen_random_uuid() → uuid
		uuid uuid PRIMARY KEY,
		username text NOT NULL,
		email text NOT NULL,
		password_hash text NOT NULL,
		CONSTRAINT u_username UNIQUE(username),
		CONSTRAINT u_email UNIQUE(email)
	);

	-- This is some example sql from one of my projects
	-- CREATE TABLE IF NOT EXISTS artist_website (
	-- 	id serial PRIMARY KEY,
	-- 	url text NOT NULL,
	-- 	folder_path text,
	-- 	website_id integer,
	-- 	artist_id integer,
	-- 	CONSTRAINT aw_url UNIQUE(url),
	-- 	CONSTRAINT aw_artist FOREIGN KEY (artist_id) REFERENCES artist (ID),
	-- 	CONSTRAINT aw_website FOREIGN KEY (website_id) REFERENCES website (ID)
	-- );
$$;
