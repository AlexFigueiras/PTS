'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { groupSessionSchema } from '../group.dto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { AttendanceList } from './attendance-list';

interface SessionFormProps {
  groupId: string;
  members: { patientId: string; patientName: string }[];
  onSubmit: (groupId: string, sessionDate: string, attendance: any[]) => void;
  isPending?: boolean;
}

export function SessionForm({ groupId, members, onSubmit, isPending }: SessionFormProps) {
  const [attendance, setAttendance] = React.useState<any[]>([]);

  const form = useForm({
    resolver: zodResolver(groupSessionSchema),
    defaultValues: {
      sessionDate: new Date().toISOString().split('T')[0],
      summary: '',
    },
  });

  const handleFormSubmit = (data: any) => {
    onSubmit(groupId, data.sessionDate, attendance);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-12">
        <Card className="rounded-[2.5rem] border-zinc-200/50 shadow-diffusion overflow-hidden">
          <CardContent className="p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="sessionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data da Sessão</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resumo da Sessão (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Breve resumo do que foi trabalhado..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-800">Lista de Chamada</h2>
          <AttendanceList members={members} onChange={setAttendance} />
        </div>

        <div className="flex justify-end pt-8">
          <Button type="submit" size="lg" className="h-16 px-12 text-lg font-bold rounded-2xl shadow-xl shadow-primary/20" disabled={isPending}>
            {isPending ? 'Salvando...' : 'Finalizar Registro de Chamada'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
