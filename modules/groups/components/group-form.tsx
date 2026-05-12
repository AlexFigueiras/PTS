'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createGroupSchema, dayOfWeekOptions } from '../group.dto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MultiSelect } from '@/components/ui/multi-select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface GroupFormProps {
  facilitatorOptions: { label: string; value: string }[];
  patientOptions: { label: string; value: string }[];
  onSubmit: (data: any, facilitators: string[], members: string[]) => void;
  isPending?: boolean;
}

export function GroupForm({ facilitatorOptions, patientOptions, onSubmit, isPending }: GroupFormProps) {
  const [selectedFacilitators, setSelectedFacilitators] = React.useState<string[]>([]);
  const [selectedMembers, setSelectedMembers] = React.useState<string[]>([]);

  const form = useForm({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: '',
      objective: '',
      targetAudience: '',
      daysOfWeek: [],
      startTime: '09:00',
      durationMinutes: 60,
    },
  });

  const handleFormSubmit = (data: any) => {
    onSubmit(data, selectedFacilitators, selectedMembers);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="rounded-[2rem] border-zinc-200/50 shadow-diffusion">
              <CardContent className="p-8 space-y-6">
                <h3 className="text-xl font-bold text-slate-800">Informações Básicas</h3>
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Grupo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Grupo de Ansiedade" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="objective"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Objetivo Terapêutico</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Qual o propósito deste grupo?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetAudience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Público-Alvo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Adultos com TAG" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-zinc-200/50 shadow-diffusion">
              <CardContent className="p-8 space-y-6">
                <h3 className="text-xl font-bold text-slate-800">Agendamento</h3>

                <FormField
                  control={form.control}
                  name="daysOfWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dias da Semana</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={dayOfWeekOptions}
                          selected={field.value}
                          onChange={field.onChange}
                          placeholder="Escolha os dias..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Horário de Início</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="durationMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duração (minutos)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-[2rem] border-zinc-200/50 shadow-diffusion h-full">
              <CardContent className="p-8 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-slate-800">Equipe e Membros</h3>
                  
                  <div className="space-y-2">
                    <Label>Facilitadores Responsáveis</Label>
                    <MultiSelect
                      options={facilitatorOptions}
                      selected={selectedFacilitators}
                      onChange={setSelectedFacilitators}
                      placeholder="Selecione os profissionais..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Membros do Grupo (Pacientes)</Label>
                    <MultiSelect
                      options={patientOptions}
                      selected={selectedMembers}
                      onChange={setSelectedMembers}
                      placeholder="Adicione pacientes ao grupo..."
                    />
                  </div>
                </div>

                <div className="pt-8">
                  <Button type="submit" className="w-full h-14 text-lg font-bold rounded-2xl" disabled={isPending}>
                    {isPending ? 'Criando Grupo...' : 'Salvar Grupo Terapêutico'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );
}
