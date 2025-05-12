-- What a uuid is: https://datatracker.ietf.org/doc/html/rfc4122 https://www.postgresql.org/docs/current/datatype-uuid.html
-- gen_random_uuid() → uuid

CREATE TABLE IF NOT EXISTS public.users (
    uuid uuid PRIMARY KEY,
    username text NOT NULL UNIQUE,
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL
);


CREATE TABLE IF NOT EXISTS public.accounts (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uuid UUID REFERENCES users ON DELETE CASCADE,
    name TEXT NOT NULL,
    balance NUMERIC(12,2) DEFAULT 0
);


CREATE TABLE IF NOT EXISTS public.incomes (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uuid UUID REFERENCES users ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    tags TEXT[],
    account_uuid UUID REFERENCES accounts ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    month TEXT
);


CREATE TABLE IF NOT EXISTS public.expenses (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uuid UUID REFERENCES users ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    tags TEXT[],
    account_uuid UUID REFERENCES accounts ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    month TEXT
);


CREATE TABLE IF NOT EXISTS transactions (
  uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uuid UUID REFERENCES users ON DELETE CASCADE,
  from_account UUID REFERENCES accounts ON DELETE CASCADE,
  to_account UUID REFERENCES accounts ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


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


CREATE OR REPLACE FUNCTION public.set_income_month_name() RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.month := TO_CHAR(NEW.created_at, 'FMMonth');
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_set_month_name
BEFORE INSERT ON public.incomes
FOR EACH ROW
EXECUTE FUNCTION set_income_month_name();


CREATE OR REPLACE FUNCTION public.set_expense_month_name() RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.month := TO_CHAR(NEW.created_at, 'FMMonth');
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_set_month_name
BEFORE INSERT ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION set_expense_month_name();


CREATE OR REPLACE FUNCTION public.update_account_balance_on_income() RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE accounts
    SET balance = balance + NEW.amount
    WHERE uuid = NEW.account_uuid;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_income_insert
AFTER INSERT ON public.incomes
FOR EACH ROW
EXECUTE FUNCTION update_account_balance_on_income();


CREATE OR REPLACE FUNCTION public.update_account_balance_on_expense() RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE accounts
    SET balance = balance - NEW.amount
    WHERE uuid = NEW.account_uuid;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_expense_insert
AFTER INSERT ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION update_account_balance_on_expense();


CREATE OR REPLACE FUNCTION public.decrease_account_balance_on_income_delete() RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE accounts
    SET balance = balance - OLD.amount
    WHERE uuid = OLD.account_uuid;
    RETURN OLD;
END;
$$;

CREATE OR REPLACE TRIGGER trg_income_delete
AFTER DELETE ON public.incomes
FOR EACH ROW
EXECUTE FUNCTION decrease_account_balance_on_income_delete();


CREATE OR REPLACE FUNCTION public.increase_account_balance_on_expense_delete() RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE accounts
    SET balance = balance + OLD.amount
    WHERE uuid = OLD.account_uuid;
    RETURN OLD;
END;
$$;

CREATE OR REPLACE TRIGGER trg_expense_delete
AFTER DELETE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION increase_account_balance_on_expense_delete();


CREATE OR REPLACE FUNCTION public.apply_account_transfer() RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE accounts
    SET balance = balance - NEW.amount
    WHERE uuid = NEW.from_account;

    UPDATE accounts
    SET balance = balance + NEW.amount
    WHERE uuid = NEW.to_account;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_apply_transfer
AFTER INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION apply_account_transfer();


CREATE OR REPLACE FUNCTION public.reverse_account_transfer_on_delete() RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Add amount back to source account
    UPDATE accounts
    SET balance = balance + OLD.amount
    WHERE uuid = OLD.from_account;

    -- Subtract amount from destination account
    UPDATE accounts
    SET balance = balance - OLD.amount
    WHERE uuid = OLD.to_account;

    RETURN OLD;
END;
$$;

CREATE OR REPLACE TRIGGER trg_reverse_transfer
AFTER DELETE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION reverse_account_transfer_on_delete();

