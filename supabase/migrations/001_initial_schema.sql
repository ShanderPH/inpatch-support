-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  platforms TEXT[] DEFAULT '{}',
  responsible VARCHAR(100) NOT NULL,
  image_url TEXT,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  estimated_end_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'development', 'testing', 'completed', 'on-hold')),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  trello_card_id VARCHAR(50) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_responsible ON projects(responsible);
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);
CREATE INDEX IF NOT EXISTS idx_projects_trello_card_id ON projects(trello_card_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_projects_updated_at 
  BEFORE UPDATE ON projects 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your auth requirements)
CREATE POLICY "Allow all operations on projects" ON projects
  FOR ALL USING (true);

-- Insert sample data
INSERT INTO projects (
  title, 
  description, 
  progress, 
  platforms, 
  responsible, 
  start_date, 
  estimated_end_date, 
  status, 
  priority
) VALUES 
(
  'Automação de Tickets Jira',
  'Integração automatizada entre N8N e Jira para criação e atualização de tickets de suporte, reduzindo tempo manual de processamento.',
  75,
  ARRAY['N8N', 'Jira'],
  'Guilherme Souza',
  '2024-01-15'::timestamp,
  '2024-02-28'::timestamp,
  'development',
  'high'
),
(
  'Dashboard Analytics Hubspot',
  'Criação de dashboard personalizado no Backoffice integrando métricas do Hubspot para acompanhamento de leads e conversões.',
  45,
  ARRAY['Hubspot', 'Backoffice'],
  'Felipe Braat',
  '2024-01-20'::timestamp,
  '2024-03-15'::timestamp,
  'development',
  'medium'
),
(
  'Sync Google Workspace',
  'Sincronização automática de usuários entre Google Workspace e sistemas internos, mantendo dados sempre atualizados.',
  90,
  ARRAY['Google Workspace', 'Backoffice'],
  'Tiago Triani',
  '2024-01-10'::timestamp,
  '2024-02-10'::timestamp,
  'testing',
  'high'
),
(
  'Workflow de Aprovações',
  'Sistema de aprovações automatizado via N8N integrando com Jira e notificações por email para streamline de processos.',
  30,
  ARRAY['N8N', 'Jira', 'Google Workspace'],
  'Guilherme Souza',
  '2024-02-01'::timestamp,
  '2024-03-30'::timestamp,
  'development',
  'medium'
),
(
  'CRM Integration Hub',
  'Central de integração unificada conectando Hubspot, Jira e Backoffice para visão 360° do cliente e automação de processos.',
  15,
  ARRAY['Hubspot', 'Jira', 'Backoffice'],
  'Felipe Braat',
  '2024-02-10'::timestamp,
  '2024-04-15'::timestamp,
  'planning',
  'high'
),
(
  'Monitoring & Alertas',
  'Sistema de monitoramento proativo com alertas automáticos via N8N para identificar e resolver problemas antes que afetem usuários.',
  60,
  ARRAY['N8N', 'Google Workspace'],
  'Tiago Triani',
  '2024-01-25'::timestamp,
  '2024-03-10'::timestamp,
  'development',
  'high'
);
