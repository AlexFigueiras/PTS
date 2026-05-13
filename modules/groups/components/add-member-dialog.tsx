'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { MultiSelect } from '@/components/ui/multi-select';
import { updateGroupMembersAction } from '../group.actions';
import { toast } from 'sonner';

interface AddMemberDialogProps {
  groupId: string;
  currentMembers: { id: string; fullName: string }[];
  allPatientOptions: { label: string; value: string }[];
}

export function AddMemberDialog({ groupId, currentMembers, allPatientOptions }: AddMemberDialogProps) {
  const [selectedIds, setSelectedIds] = React.useState<string[]>(
    currentMembers.map((m) => m.id)
  );
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);

  const handleSave = async () => {
    setIsPending(true);
    try {
      await updateGroupMembersAction(groupId, selectedIds);
      toast.success('Lista de membros atualizada com sucesso!');
      setIsOpen(false);
    } catch (error) {
      toast.error('Erro ao atualizar membros.');
      console.error(error);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary" />}>
        <Plus className="h-5 w-5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Gerenciar Membros</DialogTitle>
          <DialogDescription>
            Adicione ou remova pacientes deste grupo terapêutico.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6 space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500">Membros Selecionados</p>
            <MultiSelect
              options={allPatientOptions}
              selected={selectedIds}
              onChange={setSelectedIds}
              placeholder="Pesquisar pacientes..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)} 
            className="rounded-xl"
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            className="rounded-xl font-bold"
            disabled={isPending}
          >
            {isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
