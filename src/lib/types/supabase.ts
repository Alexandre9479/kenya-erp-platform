/**
 * Supabase Database type definitions.
 * Auto-generated after Phase 3 (run: npx supabase gen types typescript)
 * For now this provides a minimal shape — fully generated after schema creation.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          email: string;
          phone: string | null;
          address: string | null;
          city: string | null;
          country: string;
          kra_pin: string | null;
          logo_url: string | null;
          primary_color: string;
          currency: string;
          timezone: string;
          subscription_plan: string;
          subscription_status: string;
          trial_ends_at: string | null;
          is_active: boolean;
          bank_name: string | null;
          bank_account: string | null;
          bank_branch: string | null;
          invoice_prefix: string;
          quote_prefix: string;
          lpo_prefix: string;
          terms_and_conditions: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["tenants"]["Row"],
          "id" | "created_at" | "updated_at"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["tenants"]["Row"],
              "id" | "created_at" | "updated_at"
            >
          >;
        Update: Partial<Database["public"]["Tables"]["tenants"]["Insert"]>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          tenant_id: string | null;
          email: string;
          password_hash: string;
          full_name: string;
          role: UserRole;
          is_active: boolean;
          phone: string | null;
          avatar_url: string | null;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["users"]["Row"],
          "id" | "created_at" | "updated_at"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["users"]["Row"],
              "id" | "created_at" | "updated_at"
            >
          >;
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          tenant_id: string;
          category_id: string | null;
          sku: string;
          name: string;
          description: string | null;
          unit: string;
          cost_price: number;
          selling_price: number;
          vat_rate: number;
          reorder_level: number;
          is_active: boolean;
          image_url: string | null;
          barcode: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["products"]["Row"],
          "id" | "created_at" | "updated_at"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["products"]["Row"],
              "id" | "created_at" | "updated_at"
            >
          >;
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          description: string | null;
          parent_id: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["categories"]["Row"],
          "id" | "created_at"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["categories"]["Row"],
              "id" | "created_at"
            >
          >;
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      warehouses: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          location: string | null;
          is_default: boolean;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["warehouses"]["Row"],
          "id" | "created_at"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["warehouses"]["Row"],
              "id" | "created_at"
            >
          >;
        Update: Partial<Database["public"]["Tables"]["warehouses"]["Insert"]>;
        Relationships: [];
      };
      stock_levels: {
        Row: {
          id: string;
          tenant_id: string;
          product_id: string;
          warehouse_id: string;
          quantity: number;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["stock_levels"]["Row"],
          "id" | "updated_at"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["stock_levels"]["Row"],
              "id" | "updated_at"
            >
          >;
        Update: Partial<
          Database["public"]["Tables"]["stock_levels"]["Insert"]
        >;
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          city: string | null;
          kra_pin: string | null;
          credit_limit: number;
          current_balance: number;
          is_active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["customers"]["Row"],
          "id" | "created_at" | "updated_at"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["customers"]["Row"],
              "id" | "created_at" | "updated_at"
            >
          >;
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
        Relationships: [];
      };
      suppliers: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          city: string | null;
          kra_pin: string | null;
          payment_terms: number;
          current_balance: number;
          is_active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["suppliers"]["Row"],
          "id" | "created_at" | "updated_at"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["suppliers"]["Row"],
              "id" | "created_at" | "updated_at"
            >
          >;
        Update: Partial<Database["public"]["Tables"]["suppliers"]["Insert"]>;
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          tenant_id: string;
          invoice_number: string;
          customer_id: string;
          issue_date: string;
          due_date: string;
          status: InvoiceStatus;
          subtotal: number;
          tax_amount: number;
          discount_amount: number;
          total_amount: number;
          amount_paid: number;
          notes: string | null;
          terms: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["invoices"]["Row"],
          "id" | "created_at" | "updated_at"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["invoices"]["Row"],
              "id" | "created_at" | "updated_at"
            >
          >;
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
        Relationships: [];
      };
      employees: {
        Row: {
          id: string;
          tenant_id: string;
          employee_number: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          id_number: string | null;
          kra_pin: string | null;
          nssf_number: string | null;
          nhif_number: string | null;
          department: string | null;
          designation: string | null;
          employment_type: string;
          basic_salary: number;
          hire_date: string;
          termination_date: string | null;
          is_active: boolean;
          bank_name: string | null;
          bank_account: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["employees"]["Row"],
          "id" | "created_at" | "updated_at"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["employees"]["Row"],
              "id" | "created_at" | "updated_at"
            >
          >;
        Update: Partial<Database["public"]["Tables"]["employees"]["Insert"]>;
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          tenant_id: string;
          code: string;
          name: string;
          type: AccountType;
          sub_type: string | null;
          parent_id: string | null;
          description: string | null;
          is_active: boolean;
          is_system: boolean;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["accounts"]["Row"],
          "id" | "created_at"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["accounts"]["Row"],
              "id" | "created_at"
            >
          >;
        Update: Partial<Database["public"]["Tables"]["accounts"]["Insert"]>;
        Relationships: [];
      };
      invoice_items: {
        Row: {
          id: string;
          tenant_id: string;
          invoice_id: string;
          product_id: string | null;
          description: string;
          quantity: number;
          unit_price: number;
          vat_rate: number;
          vat_amount: number;
          line_total: number;
          sort_order: number;
        };
        Insert: Omit<Database["public"]["Tables"]["invoice_items"]["Row"], "id"> &
          Partial<Pick<Database["public"]["Tables"]["invoice_items"]["Row"], "id">>;
        Update: Partial<Database["public"]["Tables"]["invoice_items"]["Insert"]>;
        Relationships: [];
      };
      purchase_orders: {
        Row: {
          id: string;
          tenant_id: string;
          lpo_number: string;
          supplier_id: string;
          issue_date: string;
          expected_date: string | null;
          status: string;
          subtotal: number;
          tax_amount: number;
          total_amount: number;
          notes: string | null;
          terms: string | null;
          approved_by: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["purchase_orders"]["Row"],
          "id" | "created_at" | "updated_at"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["purchase_orders"]["Row"],
              "id" | "created_at" | "updated_at"
            >
          >;
        Update: Partial<
          Database["public"]["Tables"]["purchase_orders"]["Insert"]
        >;
        Relationships: [];
      };
      purchase_order_items: {
        Row: {
          id: string;
          tenant_id: string;
          po_id: string;
          product_id: string | null;
          description: string;
          quantity: number;
          unit_price: number;
          vat_rate: number;
          vat_amount: number;
          line_total: number;
          sort_order: number;
        };
        Insert: Omit<
          Database["public"]["Tables"]["purchase_order_items"]["Row"],
          "id"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["purchase_order_items"]["Row"],
              "id"
            >
          >;
        Update: Partial<
          Database["public"]["Tables"]["purchase_order_items"]["Insert"]
        >;
        Relationships: [];
      };
      stock_movements: {
        Row: {
          id: string;
          tenant_id: string;
          product_id: string;
          warehouse_id: string;
          type: string;
          quantity: number;
          unit_cost: number | null;
          reference_type: string | null;
          reference_id: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["stock_movements"]["Row"],
          "id" | "created_at"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["stock_movements"]["Row"],
              "id" | "created_at"
            >
          >;
        Update: Partial<
          Database["public"]["Tables"]["stock_movements"]["Insert"]
        >;
        Relationships: [];
      };
      journal_entries: {
        Row: {
          id: string;
          tenant_id: string;
          entry_number: string;
          reference_type: string | null;
          reference_id: string | null;
          description: string;
          entry_date: string;
          is_posted: boolean;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["journal_entries"]["Row"],
          "id" | "created_at"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["journal_entries"]["Row"],
              "id" | "created_at"
            >
          >;
        Update: Partial<
          Database["public"]["Tables"]["journal_entries"]["Insert"]
        >;
        Relationships: [];
      };
      journal_entry_lines: {
        Row: {
          id: string;
          tenant_id: string;
          entry_id: string;
          account_id: string;
          debit: number;
          credit: number;
          description: string | null;
        };
        Insert: Omit<
          Database["public"]["Tables"]["journal_entry_lines"]["Row"],
          "id"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["journal_entry_lines"]["Row"],
              "id"
            >
          >;
        Update: Partial<
          Database["public"]["Tables"]["journal_entry_lines"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      register_company: {
        Args: {
          p_company_name: string;
          p_company_email: string;
          p_company_phone: string;
          p_admin_name: string;
          p_admin_email: string;
          p_password_hash: string;
          p_country?: string;
          p_kra_pin?: string | null;
        };
        Returns: {
          tenant_id: string;
          user_id: string;
          slug: string;
          trial_ends: string;
        };
      };
      next_doc_number: {
        Args: { p_tenant_id: string; p_doc_type: string };
        Returns: number;
      };
      seed_chart_of_accounts: {
        Args: { p_tenant_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      user_role: UserRole;
      invoice_status: InvoiceStatus;
      account_type: AccountType;
    };
  };
}

export type UserRole =
  | "super_admin"
  | "tenant_admin"
  | "accountant"
  | "sales"
  | "purchasing"
  | "warehouse"
  | "hr"
  | "viewer";

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "partial"
  | "paid"
  | "overdue"
  | "cancelled";

export type AccountType =
  | "asset"
  | "liability"
  | "equity"
  | "revenue"
  | "expense";

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
