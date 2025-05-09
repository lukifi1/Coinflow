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


CREATE OR REPLACE FUNCTION public.delete_user(in_uuid uuid) RETURNS TABLE (username text, email text, password_hash text)
	LANGUAGE plpgsql STRICT
	AS $$
BEGIN
	PERFORM * FROM users u
	WHERE u.uuid = in_uuid;

    IF NOT FOUND THEN
		RAISE EXCEPTION 'No user found for uuid: %', in_uuid;
    END IF;
	
	RETURN QUERY DELETE FROM users u
	WHERE u.uuid = in_uuid
	RETURNING u.username, u.email, u.password_hash;
END;
$$;


CREATE OR REPLACE FUNCTION public.get_user(in_uuid uuid) RETURNS TABLE (username text, email text, password_hash text)
	LANGUAGE plpgsql STRICT
	AS $$
BEGIN
	RETURN QUERY SELECT u.username, u.email, u.password_hash
				  FROM users u
                  WHERE  u.uuid = in_uuid;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No user found for uuid: %', in_uuid;
    END IF;
END;
$$;


CREATE OR REPLACE FUNCTION public.insert_user(in_username text, in_email text, password_hash text) RETURNS uuid
	LANGUAGE plpgsql STRICT
	AS $$
DECLARE
	temp_uuid uuid;
BEGIN
	PERFORM * FROM users u
	WHERE u.username = in_username OR u.email = in_email;

    IF FOUND THEN
		RAISE EXCEPTION 'User already exists';
    END IF;

	-- Limit username
	IF NOT regexp_like(in_username, '^[\w]+$') THEN
		RAISE EXCEPTION 'Username is invalid';
	END IF;

	-- Limit email (https://regex101.com/r/lHs2R3/1)
	IF NOT regexp_like(in_email, '^[\w\-\.]+@([\w-]+\.)+[\w-]{2,}$') THEN
		RAISE EXCEPTION 'Email is invalid';
	END IF;

	INSERT INTO users VALUES (gen_random_uuid(), in_username, in_email, password_hash) RETURNING uuid INTO temp_uuid;
	RETURN temp_uuid;
END;
$$;


CREATE OR REPLACE FUNCTION public.update_user(in_uuid uuid, in_username text, in_email text, in_password_hash text) RETURNS TABLE (username text, email text, password_hash text)
	LANGUAGE plpgsql STRICT
	AS $$
BEGIN
	PERFORM * FROM users u
	WHERE u.uuid = in_uuid;

    IF NOT FOUND THEN
		RAISE EXCEPTION 'No user found for uuid: %', in_uuid;
    END IF;

	-- Limit username
	IF NOT regexp_like(in_username, '^[\w]+$') THEN
		RAISE EXCEPTION 'Username is invalid';
	END IF;

	-- Limit email (https://regex101.com/r/lHs2R3/1)
	IF NOT regexp_like(in_email, '^[\w\-\.]+@([\w-]+\.)+[\w-]{2,}$') THEN
		RAISE EXCEPTION 'Email is invalid';
	END IF;

	UPDATE users 
	SET username = in_username, email = in_email, password_hash = in_password_hash
	WHERE uuid = in_uuid;

	RETURN QUERY SELECT u.username, u.email, u.password_hash
				  FROM users u
                  WHERE  u.uuid = in_uuid;
END;
$$;
