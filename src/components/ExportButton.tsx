import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

const ExportButton = () => {
  const [exporting, setExporting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const exportToExcel = async () => {
    if (!user) return;

    setExporting(true);
    try {
      const { data: contacts, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!contacts || contacts.length === 0) {
        toast({
          title: "No Data",
          description: "No contacts to export.",
          variant: "destructive",
        });
        return;
      }

      // Prepare data for Excel
      const excelData = contacts.map(contact => ({
        'Name': contact.name || '',
        'Email': contact.email || '',
        'Phone': contact.phone || '',
        'Company': contact.company || '',
        'Job Title': contact.job_title || '',
        'Website': contact.website || '',
        'Location': contact.location || '',
        'Date Added': new Date(contact.created_at).toLocaleDateString()
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      const colWidths = [
        { wch: 20 }, // Name
        { wch: 30 }, // Email
        { wch: 15 }, // Phone
        { wch: 25 }, // Company
        { wch: 20 }, // Job Title
        { wch: 30 }, // Website
        { wch: 40 }, // Location
        { wch: 12 }  // Date Added
      ];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Contacts');

      // Generate filename with current date
      const today = new Date().toISOString().split('T')[0];
      const filename = `BuzzCon-Contacts-${today}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);

      toast({
        title: "Export Successful",
        description: `Exported ${contacts.length} contacts to ${filename}`,
      });

    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export contacts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={exportToExcel}
      disabled={exporting}
    >
      <Download className="h-4 w-4 mr-2" />
      {exporting ? 'Exporting...' : 'Export to Excel'}
    </Button>
  );
};

export default ExportButton;