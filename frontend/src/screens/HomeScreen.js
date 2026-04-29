import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import AppButton from "../components/AppButton";
import { COLORS } from "../theme";

export default function HomeScreen({
  onStartQuiz,
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Ce soir on mate quoi ?</Text>
        <Text style={styles.subtitle}>Choisis vite, popcorn deja pret.</Text>

        <View style={styles.buttonsBlock}>
          <AppButton title="Lancer le quiz" onPress={onStartQuiz} />
          <Text style={styles.helperText}>
            Reponds au quiz et on te propose les meilleurs choix.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  title: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 40,
    textAlign: "center",
    maxWidth: 560,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 560,
  },
  buttonsBlock: {
    width: "100%",
    maxWidth: 420,
    gap: 12,
  },
  helperText: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
    textAlign: "center",
  },
});
