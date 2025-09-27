'use client';

import type { Project, ProjectStatus } from '@/types/project';

import { useState, useMemo } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@heroui/modal';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { Select, SelectItem } from '@heroui/select';
import { toast } from 'react-hot-toast';

export interface ProjectEditorProps {
  isOpen: boolean;
  project?: Project | null;
  onClose: () => void;
  onSaved?: (project: Project) => void;
}

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: 'a-fazer', label: 'A Fazer' },
  { value: 'em-andamento', label: 'Em Andamento' },
  { value: 'concluido', label: 'Concluído' },
];

export function ProjectEditor({
  isOpen,
  project,
  onClose,
  onSaved,
}: ProjectEditorProps) {
  const [title, setTitle] = useState(project?.title ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [status, setStatus] = useState<ProjectStatus>(
    project?.status ?? 'a-fazer'
  );
  const [estimatedEndDate, setEstimatedEndDate] = useState<string>(
    project?.estimatedEndDate ??
      new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
  );
  const isEdit = !!project;

  // Reset fields when modal changes
  useMemo(
    () => ({ projectId: project?.id || project?.trelloCardId || '' }),
    [project]
  );

  // Use dynamic import to avoid SSR issues when used
  async function handleSubmit() {
    try {
      const { createProject, updateProject } = await import(
        '@/lib/api/client-projects'
      );

      if (!title.trim()) {
        toast.error('Informe um título válido');

        return;
      }

      if (isEdit && project) {
        const { project: updated } = await updateProject({
          id: project.id,
          trelloCardId: project.trelloCardId || project.id,
          title,
          description,
          status,
          estimatedEndDate,
        });

        toast.success('Projeto atualizado!');
        onSaved?.(updated);
      } else {
        const { project: created } = await createProject({
          title,
          description,
          status,
          estimatedEndDate,
        });

        toast.success('Projeto criado!');
        onSaved?.(created);
      }

      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao salvar');
    }
  }

  return (
    <Modal
      classNames={{ base: 'bg-background/95 backdrop-blur-md' }}
      isOpen={isOpen}
      scrollBehavior="inside"
      size="lg"
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          {isEdit ? 'Editar Projeto' : 'Novo Projeto'}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Input
              autoFocus
              label="Título"
              placeholder="Nome do projeto"
              value={title}
              onValueChange={setTitle}
            />
            <Input
              label="Descrição"
              placeholder="Descrição do projeto"
              value={description}
              onValueChange={setDescription}
            />
            <Select
              label="Status"
              selectedKeys={[status]}
              onSelectionChange={keys =>
                setStatus(Array.from(keys)[0] as ProjectStatus)
              }
            >
              {statusOptions.map(opt => (
                <SelectItem key={opt.value}>{opt.label}</SelectItem>
              ))}
            </Select>
            <Input
              label="Prazo estimado"
              type="datetime-local"
              value={new Date(estimatedEndDate).toISOString().slice(0, 16)}
              onChange={e => {
                const v = e.target.value;
                // value is local time; convert to ISO by creating Date
                const iso = new Date(v).toISOString();

                setEstimatedEndDate(iso);
              }}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancelar
          </Button>
          <Button color="primary" onPress={handleSubmit}>
            {isEdit ? 'Salvar alterações' : 'Criar projeto'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
