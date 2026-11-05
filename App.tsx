import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function App() {
  const [notice, setNotice] = useState('');

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <View style={styles.mark}>
          <Text style={styles.markText}>OF</Text>
        </View>
        <Text style={styles.eyebrow}>CSUMB CAMPUS</Text>
        <Text style={styles.title}>Find what’s{ '\n' }lost.</Text>
        <Text style={styles.description}>
          A little help from the Otter community can bring your things back.
        </Text>

        <View style={styles.buttons}>
          <SignInButton label="Continue with Google" onPress={() => setNotice('Google sign-in will be added next.')} />
          <SignInButton label="Continue with GitHub" onPress={() => setNotice('GitHub sign-in will be added next.')} />
        </View>
        {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
        <Text style={styles.note}>Sign in to browse and report campus finds.</Text>
      </View>
    </View>
  );
}

function SignInButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F8F5',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  content: {
    alignSelf: 'center',
    maxWidth: 420,
    width: '100%',
  },
  mark: {
    alignItems: 'center',
    backgroundColor: '#0B5D43',
    borderRadius: 18,
    height: 56,
    justifyContent: 'center',
    marginBottom: 32,
    width: 56,
  },
  markText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', letterSpacing: 1 },
  eyebrow: { color: '#0B5D43', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  title: { color: '#17231D', fontSize: 48, fontWeight: '800', letterSpacing: -1.5, lineHeight: 52, marginTop: 12 },
  description: { color: '#56645C', fontSize: 16, lineHeight: 24, marginTop: 16, maxWidth: 340 },
  buttons: { gap: 12, marginTop: 34 },
  button: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D5DED8',
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 54,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonPressed: { backgroundColor: '#EAF1EC' },
  buttonLabel: { color: '#1C2A22', fontSize: 15, fontWeight: '600' },
  notice: { color: '#0B5D43', fontSize: 13, marginTop: 14, textAlign: 'center' },
  note: { color: '#77837B', fontSize: 13, lineHeight: 20, marginTop: 20, textAlign: 'center' },
});
