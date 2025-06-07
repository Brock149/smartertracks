export interface CompanySettings {
  id: string;
  company_id: string;
  default_tool_location: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocationAlias {
  id: string;
  company_id: string;
  alias: string;
  standardized_location: string;
  created_at: string;
  updated_at: string;
}

export interface CompanySettingsWithAliases {
  default_tool_location: string | null;
  location_aliases: Array<{
    alias: string;
    standardized_location: string;
  }>;
} 