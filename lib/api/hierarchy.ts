import { createClient } from '@/lib/supabase/client';

export interface CreateOrganizationData {
  name: string;
  description?: string;
}

export interface CreateEnvironmentData {
  name: 'Production' | 'Staging' | 'Development';
  description?: string;
  organization_id: string;
}

export interface CreateZoneData {
  name: string;
  data_configuration?: string;
  environment_id: string;
  organization_id: string;
}

/**
 * Create a new organization
 * Also creates a membership for the current user as SuperAdmin
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

  // Create membership for current user as SuperAdmin
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: org.id,
      user_id: user.id,
      role: 'SuperAdmin',
      projects_count: 0,
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

  // Validate name is one of the allowed values
  const validNames = ['Production', 'Staging', 'Development'];
  if (!validNames.includes(data.name)) {
    throw new Error('Environment name must be Production, Staging, or Development');
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
    throw new Error(`${data.name} environment already exists in this organization`);
  }

  // Create environment
  const { data: environment, error: envError } = await supabase
    .from('environments')
    .insert({
      name: data.name,
      description: data.description || null,
      organization_id: data.organization_id
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

  // Validate zone name (domain-like format, max 253 chars)
  const zoneNameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!zoneNameRegex.test(data.name) || data.name.length > 253) {
    throw new Error('Zone name must be a valid domain name (max 253 characters)');
  }

  // Check if zone with same name already exists in this environment
  const { data: existingZone, error: checkError } = await supabase
    .from('zones')
    .select('id')
    .eq('environment_id', data.environment_id)
    .eq('name', data.name)
    .limit(1);

  if (checkError) {
    throw new Error(`Failed to check for duplicates: ${checkError.message}`);
  }

  if (existingZone && existingZone.length > 0) {
    throw new Error('A zone with this name already exists in this environment');
  }

  // Create zone
  const { data: zone, error: zoneError } = await supabase
    .from('zones')
    .insert({
      name: data.name,
      data_configuration: data.data_configuration || null,
      environment_id: data.environment_id,
      organization_id: data.organization_id
    })
    .select()
    .single();

  if (zoneError) {
    throw new Error(`Failed to create zone: ${zoneError.message}`);
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
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch zones: ${error.message}`);
  }

  return zones;
}

