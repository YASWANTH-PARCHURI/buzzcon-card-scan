import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Scan, LogOut, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import CardScanner from '@/components/CardScanner';
import ContactForm from '@/components/ContactForm';
import ContactList from '@/components/ContactList';
import ExportButton from '@/components/ExportButton';

const Index = () => {
  const { user, signOut } = useAuth();
  const [showScanner, setShowScanner] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleScanComplete = (data: any) => {
    setScannedData(data);
    setShowScanner(false);
    setShowContactForm(true);
  };

  const handleContactSaved = () => {
    setShowContactForm(false);
    setScannedData(null);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Scan className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">BuzzCon</h1>
                <p className="text-sm text-muted-foreground">Business Card Scanner</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Button 
            onClick={() => setShowScanner(true)}
            className="flex-1 sm:flex-none h-12"
          >
            <Scan className="h-5 w-5 mr-2" />
            Scan New Card
          </Button>
          <ExportButton />
        </div>

        {/* Contact Count */}
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Your Business Cards</span>
        </div>

        {/* Contact List */}
        <ContactList refreshTrigger={refreshTrigger} />
      </main>

      {/* Modals */}
      {showScanner && (
        <CardScanner
          onScanComplete={handleScanComplete}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showContactForm && (
        <ContactForm
          initialData={scannedData}
          onSave={handleContactSaved}
          onClose={() => {
            setShowContactForm(false);
            setScannedData(null);
          }}
        />
      )}
    </div>
  );
};

export default Index;
