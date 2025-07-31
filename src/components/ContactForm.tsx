import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ContactData {
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  job_title?: string;
  website?: string;
  location?: string;
  raw_text?: string;
}

interface ContactFormProps {
  initialData?: ContactData;
  onSave: () => void;
  onClose: () => void;
}

const ContactForm = ({ initialData, onSave, onClose }: ContactFormProps) => {
  const [formData, setFormData] = useState<ContactData>(initialData || {});
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleInputChange = (field: keyof ContactData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const contactData = {
        ...formData,
        user_id: user.id,
      };

      if (formData.id) {
        // Update existing contact
        const { error } = await supabase
          .from('contacts')
          .update(contactData)
          .eq('id', formData.id);

        if (error) throw error;
      } else {
        // Create new contact
        const { error } = await supabase
          .from('contacts')
          .insert([contactData]);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Contact ${formData.id ? 'updated' : 'saved'} successfully!`,
      });

      onSave();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save contact. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {formData.id ? 'Edit Contact' : 'Save Contact'}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter email address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Enter phone number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={formData.company || ''}
              onChange={(e) => handleInputChange('company', e.target.value)}
              placeholder="Enter company name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="job_title">Job Title</Label>
            <Input
              id="job_title"
              value={formData.job_title || ''}
              onChange={(e) => handleInputChange('job_title', e.target.value)}
              placeholder="Enter job title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={formData.website || ''}
              onChange={(e) => handleInputChange('website', e.target.value)}
              placeholder="Enter website URL"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Textarea
              id="location"
              value={formData.location || ''}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="Enter address or location"
              rows={2}
            />
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              'Saving...'
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {formData.id ? 'Update Contact' : 'Save Contact'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactForm;