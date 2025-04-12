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