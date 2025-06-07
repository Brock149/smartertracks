import { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from '../context/AuthContext';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'tech';
  company_id: string;
  created_at: string;
}

export function useUser() {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserData() {
      if (!user) {
        setUserData(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          setError(error.message);
        } else {
          setUserData(data);
        }
      } catch (err) {
        setError('Failed to fetch user data');
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [user]);

  return { userData, loading, error };
} 