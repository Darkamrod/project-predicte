import { StyleSheet, Text, View } from "react-native";

import type { LeaderboardEntry } from "@/domain/leaderboard/types";
import { useAppTheme } from "@/design-system/theme";
import { strings } from "@/i18n/strings";
import { ParticipantAvatar } from "./ParticipantAvatar";
import { PositionDelta } from "./PositionDelta";

export function LeaderboardRow({
  entry,
  isCurrentUser
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View
      accessibilityLabel={`${entry.displayName}, posizione ${entry.rank}, ${entry.totalPoints} punti`}
      style={[
        styles.row,
        {
          backgroundColor: isCurrentUser ? theme.colors.primaryContainer : theme.colors.surface,
          borderColor: theme.colors.border
        }
      ]}
    >
      <Text
        style={[
          styles.rank,
          { color: isCurrentUser ? theme.colors.onPrimaryContainer : theme.colors.textPrimary }
        ]}
      >
        {entry.tied ? "=" : ""}
        {entry.rank}
      </Text>
      <ParticipantAvatar initials={entry.avatarInitials} />
      <View style={styles.nameBlock}>
        <Text
          style={[
            styles.name,
            { color: isCurrentUser ? theme.colors.onPrimaryContainer : theme.colors.textPrimary }
          ]}
          numberOfLines={1}
        >
          {entry.displayName}
        </Text>
        <Text
          style={[
            styles.latest,
            { color: isCurrentUser ? theme.colors.onPrimaryContainer : theme.colors.textSecondary }
          ]}
        >
          {strings.copy.latestPoints}: +{entry.latestPoints}
        </Text>
      </View>
      <View style={styles.pointsBlock}>
        <Text
          style={[
            styles.points,
            { color: isCurrentUser ? theme.colors.onPrimaryContainer : theme.colors.textPrimary }
          ]}
        >
          {entry.totalPoints}
        </Text>
        <PositionDelta delta={entry.positionDelta} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 64,
    padding: 12
  },
  rank: {
    fontSize: 18,
    fontWeight: "800",
    minWidth: 34,
    textAlign: "center"
  },
  nameBlock: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  name: {
    fontSize: 16,
    fontWeight: "700"
  },
  latest: {
    fontSize: 13,
    fontWeight: "600"
  },
  pointsBlock: {
    alignItems: "flex-end",
    gap: 4
  },
  points: {
    fontSize: 20,
    fontWeight: "800"
  }
});
