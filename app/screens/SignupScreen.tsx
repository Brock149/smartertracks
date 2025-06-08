import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase, supabaseAdmin } from '../supabase/client';

interface SignupScreenProps {
  navigation: any;
}

export default function SignupScreen({ navigation }: SignupScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  // Debug function to test access code lookup
  const debugAccessCode = async () => {
    if (!accessCode) {
      Alert.alert('Debug', 'Please enter an access code first');
      return;
    }

    try {
      console.log('Debug: Testing access code:', accessCode);
      
      // Test with admin client to bypass RLS
      const { data, error } = await supabaseAdmin
        .from('company_access_codes')
        .select('*');
      
      console.log('All access codes:', data);
      console.log('Query error:', error);
      
      Alert.alert(
        'Debug Results', 
        `Found ${data?.length || 0} total access codes. Check console for details.`
      );
    } catch (err) {
      console.error('Debug error:', err);
      Alert.alert('Debug Error', String(err));
    }
  };

  const handleSignup = async () => {
    if (!name || !email || !password || !accessCode) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Debug: Log the access code being searched
      console.log('Searching for access code:', accessCode.trim());

      // Use admin client to validate the access code (bypasses RLS)
      const { data: accessCodeData, error: accessCodeError } = await supabaseAdmin
        .from('company_access_codes')
        .select('id, company_id, role, code')
        .ilike('code', accessCode.trim()) // Use ilike for case-insensitive search
        .eq('is_active', true);

      console.log('Access code query result:', { accessCodeData, accessCodeError });

      if (accessCodeError) {
        console.error('Access code query error:', accessCodeError);
        Alert.alert('Error', `Database error: ${accessCodeError.message}`);
        setLoading(false);
        return;
      }

      if (!accessCodeData || accessCodeData.length === 0) {
        // Let's also try a broader search to debug
        const { data: allCodes } = await supabaseAdmin
          .from('company_access_codes')
          .select('code, is_active')
          .limit(5);
        
        console.log('Available codes for debugging:', allCodes);
        
        Alert.alert(
          'Invalid Access Code', 
          'The access code you entered was not found. Please check the code and try again.'
        );
        setLoading(false);
        return;
      }

      const selectedCode = accessCodeData[0]; // Take the first match

      // Create the user account using admin client to bypass email confirmation
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          company_id: selectedCode.company_id,
          role: selectedCode.role,
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        Alert.alert('Signup Error', authError.message);
        setLoading(false);
        return;
      }

      if (authData.user) {
        // Insert user data into the users table using admin client
        const { error: userError } = await supabaseAdmin
          .from('users')
          .insert({
            id: authData.user.id,
            email: email,
            name: name, // Use the actual name field
            role: selectedCode.role,
            company_id: selectedCode.company_id,
          });

        if (userError) {
          console.error('Error creating user record:', userError);
          // Continue anyway - the auth user was created successfully
        }
      }

      Alert.alert(
        'Success',
        'Account created successfully! You can now log in.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Error', 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join SASI Tool Tracker</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Company Access Code</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your company access code"
                value={accessCode}
                onChangeText={setAccessCode}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {/* Debug button - remove in production */}
              <TouchableOpacity 
                style={styles.debugButton} 
                onPress={debugAccessCode}
              >
                <Text style={styles.debugButtonText}>Debug Access Code</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.link}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#6b7280',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    color: '#374151',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
    color: '#1f2937',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 16,
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#6b7280',
  },
  link: {
    color: '#2563eb',
    fontWeight: '600',
  },
  debugButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  debugButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 14,
  },
}); 