-- Add a policy to allow users (including techs) to view other users in their company
-- This is needed for techs to see owner names and select transfer recipients

CREATE POLICY "Users can view other users in their company" ON "public"."users"
FOR SELECT TO "authenticated" 
USING ("company_id" = "public"."get_user_company_id"("auth"."uid"())); 

-- Fix the transaction creation policy to allow users to claim tools from others
-- Users should be able to create transactions where they are either the sender OR the recipient

DROP POLICY IF EXISTS "Users can create transactions in their company" ON "public"."tool_transactions";

CREATE POLICY "Users can create transactions in their company" ON "public"."tool_transactions" 
FOR INSERT TO "authenticated" 
WITH CHECK ((
    ("company_id" = "public"."get_user_company_id"("auth"."uid"())) 
    AND (
        ("from_user_id" = "auth"."uid"()) 
        OR ("to_user_id" = "auth"."uid"()) 
        OR ("from_user_id" IS NULL)
    ) 
    AND (EXISTS ( 
        SELECT 1 FROM "public"."users"
        WHERE (("users"."id" = "tool_transactions"."to_user_id") 
               AND ("users"."company_id" = "public"."get_user_company_id"("auth"."uid"())))
    ))
)); 