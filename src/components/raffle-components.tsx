'use client';

import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { Button } from './ui/button';
import { X } from 'lucide-react';

export const WhatsappIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.487 5.235 3.487 8.413 0 6.557-5.338 11.892-11.894 11.892-1.99 0-3.902-.539-5.587-1.528L.057 24zM7.329 6.848c-.282-.475-.589-.481-.844-.488-.237-.008-.501-.008-.76-.008-.282 0-.742.113-1.124.528-.403.43-.997 1.01-1.229 2.111-.225 1.061-.202 2.545.183 3.899.418 1.458 1.439 3.012 3.23 4.803 2.068 2.01 4.032 3.109 6.275 3.935 2.455.897 4.542.822 5.922.481 1.539-.36 2.768-1.442 3.218-2.819.466-1.428.466-2.67.339-2.956-.129-.282-.466-.445-.997-.737s-3.109-1.54-3.595-1.725c-.486-.183-.844-.282-1.203.282-.359.565-1.369 1.725-1.687 2.083-.318.358-.636.403-.994.128-.359-.275-1.516-.55-2.887-1.771-1.048-.95-1.748-2.13-2.003-2.488-.255-.358-.016-.54.239-.779.237-.225.501-.589.756-.882.256-.282.338-.475.502-.812.164-.338.083-.618-.041-.856-.125-.238-.997-2.474-1.368-3.385z"/>
    </svg>
);

export const FacebookIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987H7.897v-2.89h2.54V9.526c0-2.509 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562v1.875h2.773l-.443 2.89h-2.33V21.878C18.343 21.128 22 16.991 22 12z"/>
    </svg>
);

export const TicketIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M2 9a3 3 0 0 1 0 6v1a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-1a3 3 0 0 1 0-6V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
        <path d="M13 5v2"/>
        <path d="M13 17v2"/>
        <path d="M13 11v2"/>
    </svg>
);

export const NequiIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" >
        <path d="M19.14 4.86H4.86V19.14H19.14V4.86Z" fill="#14234B" />
        <path d="M13.2 7.02H10.8V16.98H13.2V7.02Z" fill="white" />
        <path d="M9.66 16.98V14.58H7.14V12.18H9.66V9.78H7.14V7.38H9.66V4.86H5.94V19.14H9.66V16.98Z" fill="#A454C4" />
        <path d="M14.34 16.98V14.58H16.86V12.18H14.34V9.78H16.86V7.38H14.34V4.86H18.06V19.14H14.34V16.98Z" fill="#A454C4" />
    </svg>
);

interface InlineTicketProps {
    ticketModalRef: React.RefObject<HTMLDivElement>;
    ticketData: any;
    setGeneratedTicketData: (data: any) => void;
    handleDownloadTicket: () => void;
    handleShareTicket: () => void;
    formatValue: (value: string | number) => string;
    t: (key: string, params?: any) => string;
    language: string;
}

export const InlineTicket = ({ ticketModalRef, ticketData, setGeneratedTicketData, handleDownloadTicket, handleShareTicket, formatValue, t, language }: InlineTicketProps) => {
    if (!ticketData) return null;

    const locale = language === 'es' ? es : enUS;
    const receiptDate = ticketData.timestamp?.toDate ? format(ticketData.timestamp.toDate(), "d 'de' MMMM 'de' yyyy - h:mm a", { locale }) : format(new Date(), "d 'de' MMMM 'de' yyyy - h:mm a", { locale });
    const gameDateFormatted = ticketData.gameDate ? format(new Date(ticketData.gameDate + 'T00:00:00'), "d 'de' MMMM 'de' yyyy", { locale }) : 'N/A';

    return (
        <div className="mt-8 max-w-xs mx-auto">
            <div
                ref={ticketModalRef}
                className="bg-white p-2 rounded-lg shadow-lg font-mono text-gray-800 text-[11px] relative overflow-hidden"
                style={{width: '280px'}}
            >
                 <div className="absolute inset-0 flex items-center justify-center z-0">
                    <p className="text-gray-200/50 text-7xl font-bold -rotate-45 select-none opacity-50">RIFA EXPRESS</p>
                </div>
                <div className="relative z-10">
                    <div className="text-center mb-4">
                       <Button
                           onClick={() => setGeneratedTicketData(null)}
                           variant="ghost"
                           className="absolute -top-2 -right-2 z-20 h-8 w-8 p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                       >
                           <X className="h-4 w-4" />
                           <span className="sr-only">{t('close')}</span>
                       </Button>
                        <h3 className="text-xl font-bold">RIFA EXPRESS</h3>
                        <p>{t('reference')}: {ticketData.raffleRef}</p>
                        <p className="font-semibold">{t('purchaseReceipt')}</p>
                    </div>
                    <p className="text-center text-xs mb-4">{receiptDate}</p>
                    <div className="border-t border-dashed border-gray-400 my-4"></div>
                    <div className="space-y-1">
                        <div className="flex justify-between"><span>{t('client')}:</span><span className="font-semibold text-right">{ticketData.name}</span></div>
                    </div>
                    <div className="border-t border-dashed border-gray-400 my-4"></div>
                    <h4 className="font-bold text-center mb-2">{t('raffleDetails')}</h4>
                    <div className="space-y-1">
                        <div className="flex justify-between"><span>{t('prize_caps')}:</span><span className="font-semibold text-right">{formatValue(ticketData.raffleName)}</span></div>
                        <div className="flex justify-between"><span>{t('ticketValue_caps')}:</span><span className="font-semibold text-right">{formatValue(ticketData.value)}</span></div>
                        <div className="flex justify-between"><span>{t('drawDate_caps')}:</span><span className="font-semibold text-right">{gameDateFormatted}</span></div>
                        <div className="flex justify-between"><span>{t('playedWith_caps')}:</span><span className="font-semibold text-right">{ticketData.lottery}</span></div>
                        <div className="flex justify-between"><span>{t('organizedBy_caps')}:</span><span className="font-semibold text-right">{ticketData.organizerName}</span></div>
                    </div>
                    <div className="border-t border-dashed border-gray-400 my-4"></div>
                    <div className="text-center my-4">
                        <p className="font-bold">{t('assignedNumber_caps')}</p>
                        <p className="text-5xl font-bold text-violet-600 tracking-wider">{ticketData.raffleNumber}</p>
                    </div>
                    <div className="border-t border-dashed border-gray-400 my-4"></div>
                    <p className="text-center font-semibold">{t('thanksForParticipating')}</p>
                </div>
            </div>
           <div className="p-4 bg-gray-50 rounded-b-lg flex flex-col items-center justify-center gap-2 mt-auto">
               <Button
                   onClick={handleDownloadTicket}
                   className="w-full bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-semibold shadow-md"
               >
                   {t('downloadTicket')}
               </Button>
               <Button
                   onClick={handleShareTicket}
                   className="w-full bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold shadow-md flex items-center gap-2"
               >
                   <WhatsappIcon/>
                   {t('share')}
               </Button>
           </div>
       </div>
    );
};
