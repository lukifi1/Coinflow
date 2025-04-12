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
