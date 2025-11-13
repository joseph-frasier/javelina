import { createClient } from '@/lib/supabase/client';

export interface CreateOrganizationData {
  name: string;
  description?: string;
}

export interface CreateEnvironmentData {
  name: string;
  environment_type: 'production' | 'staging' | 'development';
  location?: string;
  description?: string;
  organization_id: string;
}

export interface CreateZoneData {
  name: string;
  zone_type: 'primary' | 'secondary' | 'redirect';
  description?: string;
  environment_id: string;
}

/**
 * Create a new organization
 * Also creates a membership for the current user as Admin
 */
export async function createOrganization(data: CreateOrganizationData) {
  const supabase = createClient();
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Check for duplicate organization name
  const { data: existingOrgs, error: checkError } = await supabase
    .from('organizations')
    .select('name')
    .ilike('name', data.name)
    .limit(1);

  if (checkError) {
    throw new Error(`Failed to check for duplicates: ${checkError.message}`);
  }

  if (existingOrgs && existingOrgs.length > 0) {
    throw new Error('An organization with this name already exists');
  }

  // Validate name (alphanumeric, spaces, hyphens, underscores, max 100 chars)
  const nameRegex = /^[a-zA-Z0-9\s\-_]{1,100}$/;
  if (!nameRegex.test(data.name)) {
    throw new Error('Organization name must be 1-100 characters and contain only letters, numbers, spaces, hyphens, and underscores');
  }

  // Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: data.name,
      description: data.description || null
    })
    .select()
    .single();

  if (orgError) {
    throw new Error(`Failed to create organization: ${orgError.message}`);
  }

  // Create membership for current user as Admin
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: org.id,
      user_id: user.id,
      role: 'Admin',
      environments_count: 0,
      zones_count: 0
    });

  if (memberError) {
    // Rollback organization creation if membership fails
    await supabase.from('organizations').delete().eq('id', org.id);
    throw new Error(`Failed to create membership: ${memberError.message}`);
  }

  return org;
}

/**
 * Create a new environment within an organization
 */
export async function createEnvironment(data: CreateEnvironmentData) {
  const supabase = createClient();
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Validate environment_type
  const validTypes = ['production', 'staging', 'development'];
  if (!validTypes.includes(data.environment_type)) {
    throw new Error('Environment type must be production, staging, or development');
  }

  // Check if environment with same name already exists in this org
  const { data: existingEnv, error: checkError } = await supabase
    .from('environments')
    .select('id')
    .eq('organization_id', data.organization_id)
    .eq('name', data.name)
    .limit(1);

  if (checkError) {
    throw new Error(`Failed to check for duplicates: ${checkError.message}`);
  }

  if (existingEnv && existingEnv.length > 0) {
    throw new Error(`An environment with the name "${data.name}" already exists in this organization`);
  }

  // Create environment
  const { data: environment, error: envError } = await supabase
    .from('environments')
    .insert({
      name: data.name,
      environment_type: data.environment_type,
      location: data.location || null,
      description: data.description || null,
      organization_id: data.organization_id,
      status: 'active',
      created_by: user.id
    })
    .select()
    .single();

  if (envError) {
    throw new Error(`Failed to create environment: ${envError.message}`);
  }

  return environment;
}

/**
 * Create a new zone within an environment
 */
export async function createZone(data: CreateZoneData) {
  const supabase = createClient();
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Validate zone name (domain-like format, max 253 chars)
  const zoneNameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!zoneNameRegex.test(data.name) || data.name.length > 253) {
    throw new Error('Zone name must be a valid domain name (max 253 characters)');
  }

  // Validate zone_type
  const validTypes = ['primary', 'secondary', 'redirect'];
  if (!validTypes.includes(data.zone_type)) {
    throw new Error('Zone type must be primary, secondary, or redirect');
  }

  // Get environment to find organization_id
  const { data: environment, error: envError } = await supabase
    .from('environments')
    .select('organization_id')
    .eq('id', data.environment_id)
    .single();

  if (envError || !environment) {
    throw new Error('Environment not found');
  }

  // Check for global zone name uniqueness (across all environments and organizations)
  console.log('🔍 Checking global uniqueness for zone:', data.name);
  const { data: existingZones, error: checkError } = await supabase
    .from('zones')
    .select('id')
    .eq('name', data.name)
    .is('deleted_at', null)
    .limit(1);

  if (checkError) {
    console.error('❌ Error checking zone name uniqueness:', checkError);
    throw new Error(`Failed to check zone name uniqueness: ${checkError.message}`);
  }

  const nameExists = existingZones && existingZones.length > 0;
  const isLive = !nameExists;
  
  console.log('📊 Uniqueness check results:', {
    zoneName: data.name,
    existingZones: existingZones?.length || 0,
    nameExists,
    isLive
  });

  // Create zone
  const { data: zone, error: zoneError } = await supabase
    .from('zones')
    .insert({
      name: data.name,
      zone_type: data.zone_type,
      description: data.description || null,
      environment_id: data.environment_id,
      active: true,
      live: isLive,
      created_by: user.id
    })
    .select()
    .single();

  if (zoneError) {
    console.error('❌ Error creating zone:', zoneError);
    throw new Error(`Failed to create zone: ${zoneError.message}`);
  }

  console.log('✅ Zone created:', { id: zone.id, name: zone.name, live: zone.live });

  // If zone was flagged for review (live=false), create audit log entry
  if (!isLive && zone) {
    console.log('🚩 Creating audit log for flagged zone');
    await supabase
      .from('audit_logs')
      .insert({
        table_name: 'zones',
        record_id: zone.id,
        action: 'zone.flagged_for_review',
        new_data: zone,
        user_id: user.id,
        metadata: {
          reason: 'duplicate_name',
          zone_name: data.name,
          flagged_at: new Date().toISOString()
        }
      });
  }

  return zone;
}

/**
 * Fetch all organizations for the current user
 */
export async function fetchUserOrganizations() {
  const supabase = createClient();

  const { data: orgs, error } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      description,
      created_at,
      updated_at,
      organization_members!inner(role)
    `)
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch organizations: ${error.message}`);
  }

  return orgs;
}

/**
 * Fetch all environments for an organization
 */
export async function fetchOrganizationEnvironments(organizationId: string) {
  const supabase = createClient();

  const { data: environments, error } = await supabase
    .from('environments')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch environments: ${error.message}`);
  }

  return environments;
}

/**
 * Fetch all zones for an environment
 */
export async function fetchEnvironmentZones(environmentId: string) {
  const supabase = createClient();

  const { data: zones, error } = await supabase
    .from('zones')
    .select('*')
    .eq('environment_id', environmentId)
    .is('deleted_at', null)
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch zones: ${error.message}`);
  }

  return zones;
}

