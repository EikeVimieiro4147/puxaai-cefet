import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, HelpCircle, FileJson, Info } from 'lucide-react';
import { transformFullData } from '@/lib/dataAdapter';
import { RawScheduleJSON, Course } from '@/types/schedule';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface JsonUploadProps {
    onDataLoaded: (data: { courses: Course[]; confirmedIds: string[]; plannedIds: string[] }) => void;
}

export function JsonUpload({ onDataLoaded }: JsonUploadProps) {
    const { toast } = useToast();

    const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
            toast({
                title: "Arquivo inválido",
                description: "Por favor, selecione um arquivo JSON.",
                variant: "destructive",
            });
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string) as RawScheduleJSON;

                if (!json.courses || !Array.isArray(json.courses)) {
                    throw new Error("Formato de JSON inválido: campo 'courses' não encontrado.");
                }

                const transformed = transformFullData(json);
                onDataLoaded(transformed);

                toast({
                    title: "Sucesso!",
                    description: `${transformed.courses.length} disciplinas carregadas.`,
                });
            } catch (err) {
                console.error(err);
                toast({
                    title: "Erro ao ler JSON",
                    description: err instanceof Error ? err.message : "Verifique o formato do arquivo.",
                    variant: "destructive",
                });
            }
        };
        reader.readAsText(file);
    }, [onDataLoaded, toast]);

    const jsonStructure = {
        version: "1.0",
        metadata: { semester: "2024/1", last_update: "ISO_DATE" },
        courses: [
            {
                id: "unique_id",
                code: "MAT101",
                name: "Cálculo I",
                degree: "Computação",
                professors: ["Dr. Silva"],
                period: "1",
                credits: 4,
                occupancy: { total: "60", occupied: "40", requested: "5" },
                slots: [{ day: "SEG", start: "08:00", end: "10:00" }],
                pre_requisits: ["PREREQ_CODE"]
            }
        ],
        user: {
            confirmed_course_ids: [],
            planned_course_ids: [],
            completed_courses_codes: ["CODE"]
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
                id="json-upload"
            />
            <label htmlFor="json-upload">
                <Button variant="outline" size="sm" asChild className="cursor-pointer h-8 gap-2">
                    <span>
                        <Upload className="w-3.5 h-3.5" />
                        Carregar JSON
                    </span>
                </Button>
            </label>

            <Dialog>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full group hover:bg-primary transition-colors">
                                    <HelpCircle className="w-4 h-4 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                                </Button>
                            </DialogTrigger>

                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="text-xs">Ver estrutura do JSON</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Estrutura do Arquivo JSON</DialogTitle>
                        <DialogDescription>
                            O arquivo deve seguir o formato abaixo para ser processado corretamente.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto bg-muted rounded-md p-4 mt-2">
                        <pre className="text-[11px] font-mono">
                            {JSON.stringify(jsonStructure, null, 2)}
                        </pre>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input className={className} {...props} />;
}

