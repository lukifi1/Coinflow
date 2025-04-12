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
