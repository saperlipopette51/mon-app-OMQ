import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AppButton from "../components/AppButton";
import { COLORS } from "../theme";

export default function FilmsScreen({
  films = [],
  loading = false,
  error = "",
  onBack = () => {},
  onRefresh = () => {},
}) {
  const safeFilms = Array.isArray(films) ? films : [];
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Films</Text>
        <Text style={styles.subtitle}>Resultats API en direct.</Text>

        <View style={styles.actions}>
          <AppButton title="Retour accueil" onPress={onBack} variant="secondary" />
          <AppButton title="Recharger /films" onPress={onRefresh} />
        </View>

        {loading ? (
          <View style={styles.card}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.value}>Chargement...</Text>
          </View>
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Liste ({safeFilms.length})</Text>
            {safeFilms.length === 0 ? (
              <Text style={styles.value}>Aucun film disponible.</Text>
            ) : (
              safeFilms.map((film, index) => (
                <View
                  key={String(film?.id ?? `${film?.title ?? "film"}-${index}`)}
                  style={styles.filmRow}
                >
                  <Text style={styles.filmTitle}>{film?.title || "Titre inconnu"}</Text>
                  <Text style={styles.value}>
                    {film?.year || "Annee inconnue"} - {film?.genre || "Genre non precise"}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 20,
    paddingBottom: 28,
    gap: 14,
  },
  title: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 38,
    marginTop: 8,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 15,
    marginTop: -6,
  },
  actions: {
    gap: 10,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
  },
  filmRow: {
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  filmTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
  },
  value: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    color: COLORS.error,
    fontSize: 15,
    fontWeight: "700",
  },
});
