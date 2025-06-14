-- Add superadmin policies for companies table
CREATE POLICY "Superadmins can manage all companies" ON "public"."companies" 
TO "authenticated" 
USING ("public"."is_superadmin"("auth"."uid"())) 
WITH CHECK ("public"."is_superadmin"("auth"."uid"()));

-- Add superadmin policies for users table  
CREATE POLICY "Superadmins can view all users" ON "public"."users" 
FOR SELECT TO "authenticated" 
USING ("public"."is_superadmin"("auth"."uid"()));

-- Add superadmin policies for tools table
CREATE POLICY "Superadmins can view all tools" ON "public"."tools" 
FOR SELECT TO "authenticated" 
USING ("public"."is_superadmin"("auth"."uid"()));

-- Add superadmin policies for tool_transactions table
CREATE POLICY "Superadmins can view all transactions" ON "public"."tool_transactions" 
FOR SELECT TO "authenticated" 
USING ("public"."is_superadmin"("auth"."uid"()));

-- Grant execute permission on get_companies_overview to authenticated users
-- (The function itself checks for superadmin role)
GRANT EXECUTE ON FUNCTION "public"."get_companies_overview"() TO "authenticated"; 