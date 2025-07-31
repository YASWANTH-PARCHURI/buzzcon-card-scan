import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Edit, Trash2, Mail, Phone, Building2, MapPin, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import ContactForm from './ContactForm';

interface Contact {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  job_title?: string;
  website?: string;
  location?: string;
  raw_text?: string;
  created_at: string;
}

interface ContactListProps {
  refreshTrigger: number;
}

const ContactList = ({ refreshTrigger }: ContactListProps) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchContacts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setContacts(data || []);
      setFilteredContacts(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load contacts.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [user, refreshTrigger]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredContacts(contacts);
    } else {
      const filtered = contacts.filter(contact =>
        (contact.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (contact.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (contact.company?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (contact.phone?.includes(searchTerm))
      );
      setFilteredContacts(filtered);
    }
  }, [searchTerm, contacts]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setContacts(prev => prev.filter(contact => contact.id !== id));
      toast({
        title: "Success",
        description: "Contact deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete contact.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {filteredContacts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                {searchTerm ? 'No contacts found matching your search.' : 'No contacts saved yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredContacts.map((contact) => (
              <Card key={contact.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {contact.name || 'Unnamed Contact'}
                        </h3>
                        {contact.job_title && contact.company && (
                          <p className="text-sm text-muted-foreground">
                            {contact.job_title} at {contact.company}
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        {contact.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{contact.email}</span>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                        {contact.company && !contact.job_title && (
                          <div className="flex items-center gap-2 text-sm">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{contact.company}</span>
                          </div>
                        )}
                        {contact.website && (
                          <div className="flex items-center gap-2 text-sm">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span className="text-primary hover:underline cursor-pointer">
                              {contact.website}
                            </span>
                          </div>
                        )}
                        {contact.location && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{contact.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingContact(contact)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(contact.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {editingContact && (
        <ContactForm
          initialData={editingContact}
          onSave={() => {
            setEditingContact(null);
            fetchContacts();
          }}
          onClose={() => setEditingContact(null)}
        />
      )}
    </>
  );
};

export default ContactList;