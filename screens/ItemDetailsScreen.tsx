
import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";

type Props = {
  onBack?: () => void;
};

export default function ItemDetailsScreen({ onBack }: Props) {
  const item = {
    name: "Blue Water Bottle",
    type: "Lost",
    description: "Blue reusable water bottle with stickers.",
    location: "CSUMB Library",
    date: "November 4, 2026",
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Item Details</Text>

      <View style={styles.card}>
        <Text style={styles.itemName}>{item.name}</Text>

        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{item.type}</Text>

        <Text style={styles.label}>Description</Text>
        <Text style={styles.value}>{item.description}</Text>

        <Text style={styles.label}>Location</Text>
        <Text style={styles.value}>{item.location}</Text>

        <Text style={styles.label}>Date</Text>
        <Text style={styles.value}>{item.date}</Text>
      </View>

      {onBack && (
        <Pressable style={styles.button} onPress={onBack}>
          <Text style={styles.buttonText}>Go Back</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  content: {
    padding: 20,
    paddingTop: 55,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#112E51",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  itemName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#112E51",
    marginBottom: 15,
  },
  label: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#555555",
    marginTop: 12,
  },
  value: {
    fontSize: 16,
    color: "#222222",
    marginTop: 4,
  },
  button: {
    backgroundColor: "#112E51",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
