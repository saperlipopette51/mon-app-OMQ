import { useEffect, useState } from "react";
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AppButton from "../components/AppButton";
import { COLORS } from "../theme";

function Poster({ uri }) {
  const [hasError, setHasError] = useState(false);
  const imageUrl = String(uri || "").trim();

  useEffect(() => {
    setHasError(false);
  }, [imageUrl]);

  const renderFallback = () => (
    <View style={styles.posterPlaceholder}>
      <Text style={styles.posterPlaceholderEmoji}>{"\u2B50"}</Text>
    </View>
  );

  if (!imageUrl || hasError || !/^https?:\/\/.+/i.test(imageUrl)) {
    return renderFallback();
  }

  return (
    <Image
      source={{ uri: imageUrl }}
      style={styles.posterImage}
      resizeMode="cover"
      onError={() => setHasError(true)}
    />
  );
}

export default function FavoritesScreen({ favorites = [], onBack = () => {} }) {
  const safeFavorites = Array.isArray(favorites) ? favorites : [];
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Mes favoris</Text>
        <Text style={styles.subtitle}>Tes coups de coeur en un seul endroit.</Text>

        <AppButton title="Retour recommandations" onPress={onBack} variant="secondary" />

        {safeFavorites.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.value}>Aucun favori pour le moment.</Text>
          </View>
        ) : (
          safeFavorites.map((item, index) => (
            <View key={String(item?.key || item?.id || `fav-${index}`)} style={styles.card}>
              <View style={styles.row}>
                <Poster uri={item?.posterUri} />
                <View style={styles.metaBlock}>
                  <Text style={styles.filmTitle}>{item?.title || "Titre inconnu"}</Text>
                  <Text style={styles.value}>
                    {item?.year || "Annee inconnue"} - {item?.genre || "Genre non precise"}
                  </Text>
                  <Text style={styles.match}>Match {item?.score || 0}%</Text>
                </View>
              </View>
              <Text style={styles.why}>
                {item?.why || "Ajoute depuis les recommandations."}
              </Text>
            </View>
          ))
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
    gap: 12,
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
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  posterImage: {
    width: 72,
    height: 108,
    borderRadius: 10,
    backgroundColor: "#1B1B1B",
  },
  posterPlaceholder: {
    width: 72,
    height: 108,
    borderRadius: 10,
    backgroundColor: "#1B1B1B",
    alignItems: "center",
    justifyContent: "center",
  },
  posterPlaceholderEmoji: {
    fontSize: 24,
  },
  metaBlock: {
    flex: 1,
    gap: 4,
  },
  filmTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24,
  },
  value: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  match: {
    color: COLORS.success,
    fontSize: 15,
    fontWeight: "800",
  },
  why: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
