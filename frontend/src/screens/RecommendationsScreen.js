import { useEffect, useState } from "react";
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from "react-native";
import AppButton from "../components/AppButton";
import { COLORS } from "../theme";
import { filmKey } from "../recommendations/engine";

function ActionChip({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Poster({ uri }) {
  const [hasError, setHasError] = useState(false);
  const imageUrl = String(uri || "").trim();

  useEffect(() => {
    setHasError(false);
  }, [imageUrl]);

  const renderFallback = () => (
    <View style={styles.posterPlaceholder}>
      <Text style={styles.posterPlaceholderEmoji}>{"\u{1F3AC}"}</Text>
    </View>
  );

  if (!imageUrl) return renderFallback();

  const isValidRemoteUri = /^https?:\/\/.+/i.test(imageUrl);
  if (!isValidRemoteUri || hasError) {
    return renderFallback();
  }

  try {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={styles.posterImage}
        resizeMode="cover"
        onError={() => setHasError(true)}
      />
    );
  } catch {
    return renderFallback();
  }
}

function getPlatformVisual(platform) {
  const normalized = String(platform || "").toLowerCase();
  if (normalized.includes("netflix")) return "\u{1F534}";
  if (normalized.includes("prime")) return "\u{1F535}";
  if (normalized.includes("apple")) return "\u{1F34E}";
  if (normalized.includes("disney")) return "\u{1F7E1}";
  if (normalized.includes("hbo") || normalized.includes("max")) return "\u{1F7E3}";
  return "\u{1F3AC}";
}

export default function RecommendationsScreen({
  items = [],
  loading = false,
  error = "",
  notice = "",
  onBack = () => {},
  onRestartQuiz = () => {},
  onSurprise = () => {},
  onOpenFavorites = () => {},
  likedMap = {},
  dislikedMap = {},
  seenMap = {},
  favoriteMap = {},
  onToggleLike = () => {},
  onToggleDislike = () => {},
  onToggleSeen = () => {},
  onToggleFavorite = () => {},
}) {
  const safeItems = Array.isArray(items) ? items : [];
  const displayItems = safeItems.slice(0, 5);
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Recommandations</Text>
        <Text style={styles.subtitle}>Top choix bases sur tes reponses quiz.</Text>

        <View style={styles.topActions}>
          <AppButton title="Retour accueil" onPress={onBack} variant="secondary" />
          <AppButton title="Mes favoris" onPress={onOpenFavorites} variant="secondary" />
          <AppButton title={"Surprends-moi \u{1F3B2}"} onPress={onSurprise} />
        </View>

        {!!notice && !loading && (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.card}>
            <Text style={styles.loading}>Recherche en cours...</Text>
          </View>
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.error}>{error}</Text>
            <AppButton title="Refaire le questionnaire" onPress={onRestartQuiz} />
          </View>
        ) : displayItems.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.value}>
              OMQ a fouille sous tous les coussins du canape, mais rien ne matche vraiment.
            </Text>
            <Text style={styles.value}>
              Refaire le questionnaire avec un peu plus de marge devrait sauver la soiree.
            </Text>
            <AppButton title="Refaire le questionnaire" onPress={onRestartQuiz} />
          </View>
        ) : (
          displayItems.map((item, index) => {
            const safeItem = item || {};
            const computedKey = String(filmKey(safeItem));
            const key = computedKey || String(safeItem.key || safeItem.id || `rec-${index}`);
            return (
              <View key={key} style={styles.card}>
                <View style={styles.row}>
                  <Poster uri={safeItem.posterUri} />
                  <View style={styles.metaBlock}>
                    <Text style={styles.filmTitle}>{safeItem.title || "Titre inconnu"}</Text>
                    <Text style={styles.value}>
                      {safeItem.year || "Annee inconnue"} -{" "}
                      {safeItem.genre || "Genre non precise"}
                    </Text>
                    <View style={styles.matchRow}>
                      <Text style={styles.match}>Match {safeItem.score || 0}%</Text>
                      {!!safeItem?.raw?.platform && (
                        <Text style={styles.platformInline}>
                          {getPlatformVisual(safeItem.raw.platform)} {safeItem.raw.platform}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Resume</Text>
                  <Text style={styles.summaryText} numberOfLines={3} ellipsizeMode="tail">
                    {safeItem.summary || "Resume indisponible pour ce titre."}
                  </Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Pourquoi ce match ?</Text>
                  <Text style={styles.why}>
                    {safeItem.why || "Alternative coherente selon vos choix du quiz."}
                  </Text>
                </View>
                <View style={styles.chipsRow}>
                  <ActionChip
                    label={"\u{1F44D}"}
                    active={Boolean(likedMap[key])}
                    onPress={() => onToggleLike(safeItem)}
                  />
                  <ActionChip
                    label={"\u{1F44E}"}
                    active={Boolean(dislikedMap[key])}
                    onPress={() => onToggleDislike(safeItem)}
                  />
                  <ActionChip
                    label={"\u{1F441}\uFE0F Deja vu"}
                    active={Boolean(seenMap[key])}
                    onPress={() => onToggleSeen(safeItem)}
                  />
                  <ActionChip
                    label={"\u2B50 Favori"}
                    active={Boolean(favoriteMap[key])}
                    onPress={() => onToggleFavorite(safeItem)}
                  />
                </View>
              </View>
            );
          })
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
  topActions: {
    gap: 10,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  loading: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
  },
  error: {
    color: COLORS.error,
    fontSize: 15,
    fontWeight: "700",
  },
  noticeCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#151518",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeText: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  value: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  posterImage: {
    width: 88,
    height: 128,
    borderRadius: 10,
    backgroundColor: "#1B1B1B",
  },
  posterPlaceholder: {
    width: 88,
    height: 128,
    borderRadius: 10,
    backgroundColor: "#1B1B1B",
    alignItems: "center",
    justifyContent: "center",
  },
  posterPlaceholderEmoji: {
    fontSize: 28,
  },
  metaBlock: {
    flex: 1,
    gap: 6,
  },
  filmTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24,
  },
  match: {
    color: COLORS.success,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 2,
  },
  platformInline: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: "#3A0B10",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  detailCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A2A2F",
    backgroundColor: "#121216",
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 4,
  },
  detailLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  why: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
  summaryText: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "left",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#1A1A1A",
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#2C0C0F",
  },
  chipText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  chipTextActive: {
    color: COLORS.text,
  },
});
