-- Look up the user by email (replace this email with your actual test user's email)
DO $$
DECLARE
    new_org_id UUID;
    target_user_id UUID;
BEGIN
    -- Replace this with the actual email of your test NGO user
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'harshdixit1612@gmail.com';
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found. Please ensure the email is correct and they have signed up.';
    END IF;

    -- Create the organization
    INSERT INTO public.organizations (name)
    VALUES ('Global Earth Forward Initiative')
    RETURNING id INTO new_org_id;

    -- Add the user to the organization
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (new_org_id, target_user_id, 'ngo');

    RAISE NOTICE 'Successfully created organization and added user as NGO';
END $$;
