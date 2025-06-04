[
  {
    "schemaname": "public",
    "tablename": "checklist_reports",
    "policyname": "Admins can manage checklist reports in their company",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(is_admin(auth.uid()) AND (company_id = ( SELECT users.company_id\n   FROM users\n  WHERE (users.id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "checklist_reports",
    "policyname": "Service role can delete checklist reports",
    "permissive": "PERMISSIVE",
    "roles": "{service_role}",
    "cmd": "DELETE",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "checklist_reports",
    "policyname": "Service role can do everything on reports",
    "permissive": "PERMISSIVE",
    "roles": "{service_role}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "checklist_reports",
    "policyname": "Users can create checklist reports in their company",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(company_id = ( SELECT users.company_id\n   FROM users\n  WHERE (users.id = auth.uid())))"
  },
  {
    "schemaname": "public",
    "tablename": "checklist_reports",
    "policyname": "Users can view checklist reports in their company",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "((company_id = ( SELECT users.company_id\n   FROM users\n  WHERE (users.id = auth.uid()))) OR (EXISTS ( SELECT 1\n   FROM tool_transactions\n  WHERE ((tool_transactions.id = checklist_reports.transaction_id) AND ((tool_transactions.from_user_id = auth.uid()) OR (tool_transactions.to_user_id = auth.uid()))))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "companies",
    "policyname": "Admins can manage their own company",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(is_admin(auth.uid()) AND (id = ( SELECT users.company_id\n   FROM users\n  WHERE (users.id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "companies",
    "policyname": "Service role can do everything on companies",
    "permissive": "PERMISSIVE",
    "roles": "{service_role}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "companies",
    "policyname": "Users can view their own company",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(id = ( SELECT users.company_id\n   FROM users\n  WHERE (users.id = auth.uid())))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tool_checklists",
    "policyname": "Admins can delete tool_checklists",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "(EXISTS ( SELECT 1\n   FROM users\n  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tool_checklists",
    "policyname": "Admins can manage checklists in their company",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(is_admin(auth.uid()) AND (company_id = ( SELECT users.company_id\n   FROM users\n  WHERE (users.id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tool_checklists",
    "policyname": "Admins can update tool_checklists",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(EXISTS ( SELECT 1\n   FROM users\n  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tool_checklists",
    "policyname": "Service role can do everything",
    "permissive": "PERMISSIVE",
    "roles": "{service_role}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "tool_checklists",
    "policyname": "Service role can do everything on checklists",
    "permissive": "PERMISSIVE",
    "roles": "{service_role}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "tool_checklists",
    "policyname": "Users can view checklists in their company",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(company_id = ( SELECT users.company_id\n   FROM users\n  WHERE (users.id = auth.uid())))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tool_transactions",
    "policyname": "Admins can manage transactions in their company",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(is_admin(auth.uid()) AND (company_id = ( SELECT users.company_id\n   FROM users\n  WHERE (users.id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tool_transactions",
    "policyname": "Service role can do everything on transactions",
    "permissive": "PERMISSIVE",
    "roles": "{service_role}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "tool_transactions",
    "policyname": "Users can create transactions in their company",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((company_id = ( SELECT users.company_id\n   FROM users\n  WHERE (users.id = auth.uid()))) AND ((from_user_id = auth.uid()) OR (from_user_id IS NULL)) AND (EXISTS ( SELECT 1\n   FROM users\n  WHERE ((users.id = tool_transactions.to_user_id) AND (users.company_id = ( SELECT users_1.company_id\n           FROM users users_1\n          WHERE (users_1.id = auth.uid())))))))"
  },
  {
    "schemaname": "public",
    "tablename": "tool_transactions",
    "policyname": "Users can view transactions in their company",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "((company_id = ( SELECT users.company_id\n   FROM users\n  WHERE (users.id = auth.uid()))) OR (from_user_id = auth.uid()) OR (to_user_id = auth.uid()))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tools",
    "policyname": "Admins can delete tools",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "(EXISTS ( SELECT 1\n   FROM users\n  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tools",
    "policyname": "Admins can manage tools in their company",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(is_admin(auth.uid()) AND (company_id = ( SELECT users.company_id\n   FROM users\n  WHERE (users.id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tools",
    "policyname": "Service role can delete tools",
    "permissive": "PERMISSIVE",
    "roles": "{service_role}",
    "cmd": "DELETE",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tools",
    "policyname": "Service role can do everything on tools",
    "permissive": "PERMISSIVE",
    "roles": "{service_role}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "tools",
    "policyname": "Service role can update tools",
    "permissive": "PERMISSIVE",
    "roles": "{service_role}",
    "cmd": "UPDATE",
    "qual": "true",
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "tools",
    "policyname": "Users can view tools in their company",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(company_id = ( SELECT users.company_id\n   FROM users\n  WHERE (users.id = auth.uid())))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Admins can delete users",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "(EXISTS ( SELECT 1\n   FROM users users_1\n  WHERE ((users_1.id = auth.uid()) AND (users_1.role = 'admin'::text))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Admins can manage users in their company",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(is_admin(auth.uid()) AND (company_id = ( SELECT users_1.company_id\n   FROM users users_1\n  WHERE (users_1.id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Admins can view users in their company",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(is_admin(auth.uid()) AND (company_id = ( SELECT users_1.company_id\n   FROM users users_1\n  WHERE (users_1.id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Allow insert for service role",
    "permissive": "PERMISSIVE",
    "roles": "{service_role}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Allow service role to delete users",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "(auth.role() = 'service_role'::text)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Company admins can view all users in their company",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM users u2\n  WHERE ((u2.id = auth.uid()) AND (u2.company_id = users.company_id) AND (u2.role = 'admin'::text))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Service role can do everything on users",
    "permissive": "PERMISSIVE",
    "roles": "{service_role}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users can view their own record",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = id)",
    "with_check": null
  }
]

--Here is this second SQL response 
[
  {
    "schema": "public",
    "function_name": "is_admin",
    "arguments": "uid uuid"
  }
]