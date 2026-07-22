import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Info, Upload } from "lucide-react";
import { WELCOME_MESSAGE } from "@/data/references";
import { transformFullData } from '@/lib/dataAdapter';
import { RawScheduleJSON, Course } from '@/types/schedule';
import { useToast } from '@/hooks/use-toast';

interface WelcomeDialogProps {
    onDataLoaded: (data: { courses: Course[]; confirmedIds: string[]; plannedIds: string[] }) => void;
}

export function WelcomeDialog({ onDataLoaded }: WelcomeDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string) as RawScheduleJSON;
                const transformed = transformFullData(json);
                onDataLoaded(transformed);
                setIsOpen(false);
                toast({
                    title: "Sucesso!",
                    description: `${transformed.courses.length} disciplinas carregadas.`,
                });
            } catch (err) {
                toast({
                    title: "Erro ao ler JSON",
                    description: "Verifique o formato do arquivo.",
                    variant: "destructive",
                });
            }
        };
        reader.readAsText(file);
    };


    useEffect(() => {
        // Show dialog on mount
        const timer = setTimeout(() => {
            setIsOpen(true);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[500px] border-primary/20 shadow-2xl">
                <DialogHeader>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                        <Info className="w-6 h-6 text-primary" />
                    </div>
                    <DialogTitle className="text-center text-xl">{WELCOME_MESSAGE.title}</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-6">
                    <div className="bg-muted/50 p-4 rounded-lg space-y-4 border border-border">
                        <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-primary mt-1 shrink-0" />
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                {WELCOME_MESSAGE.description}
                            </p>
                        </div>

                        <div className="flex flex-col gap-2">
                            <input
                                type="file"
                                id="welcome-json-upload"
                                accept=".json,application/json"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                            <Button asChild className="w-full gap-2 py-6 text-base font-bold shadow-lg shadow-primary/20">
                                <label htmlFor="welcome-json-upload" className="cursor-pointer">
                                    <Upload className="w-5 h-5" />
                                    Importar meu JSON
                                </label>
                            </Button>
                            <p className="text-[10px] text-center text-muted-foreground">
                                {WELCOME_MESSAGE.instructions}
                            </p>
                        </div>
                    </div>


                    <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {WELCOME_MESSAGE.footer}
                        </p>
                        <div className="grid gap-2">
                            {WELCOME_MESSAGE.repositories.map((repo, idx) => (
                                <a
                                    key={idx}
                                    href={repo.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col p-3 rounded-md border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold group-hover:text-primary transition-colors">
                                            {repo.name}
                                        </span>
                                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={() => setIsOpen(false)} className="w-full">
                        Entendi, vamos lá!
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
