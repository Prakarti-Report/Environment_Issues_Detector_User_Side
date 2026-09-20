import { supabase } from '../lib/supabase';

export type ReportStatus = 
  | 'reported'
  | 'ai_analyzed'
  | 'under_review'
  | 'verified'
  | 'action_initiated'
  | 'resolved';

export interface Report {
  id: string;
  user_id: string;
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  location_accuracy: number | null;
  address: string | null;
  status: ReportStatus;
  severity: string | null;
  ai_category: string | null;
  ai_confidence: number | null;
  ai_description: string | null;
  assigned_worker_id?: string | null;
  organization_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportImage {
  id: string;
  report_id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  created_at: string;
}

export const getReports = async () => {
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      report_images ( storage_path )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const createReport = async (
  report: Omit<Report, 'id' | 'created_at' | 'updated_at'> & { status?: ReportStatus },
  file?: File
) => {
  // Ensure the user's profile exists to satisfy the foreign key constraint
  const { data: userData } = await supabase.auth.getUser();
  if (userData?.user) {
    const fullName = userData.user.user_metadata?.full_name || 'Citizen Reporter';
    await supabase.from('profiles').upsert(
      { id: userData.user.id, full_name: fullName },
      { onConflict: 'id' }
    );
  }

  const { data: reportData, error: reportError } = await supabase
    .from('reports')
    .insert([report])
    .select()
    .single();

  if (reportError) throw reportError;

  if (file && reportData) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${reportData.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('environmental-reports')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { error: imageRecordError } = await supabase
      .from('report_images')
      .insert([
        {
          report_id: reportData.id,
          storage_path: filePath,
          original_filename: file.name,
          mime_type: file.type,
          file_size: file.size,
        },
      ]);
      
    if (imageRecordError) throw imageRecordError;
  }

  return reportData;
};

export const updateReport = async (
  id: string,
  updates: Partial<Omit<Report, 'id' | 'created_at' | 'updated_at'>>
) => {
  const { data, error } = await supabase
    .from('reports')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      report_images ( storage_path )
    `)
    .single();

  if (error) throw error;
  return data;
};

export const getImageUrl = (path: string) => {
  return supabase.storage.from('environmental-reports').getPublicUrl(path).data.publicUrl;
};

