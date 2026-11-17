import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ApiError, createListing, type Listing, type ListingCategory, type ListingType } from "@/lib/api";
import type { Pin } from "@/features/map/campus";
import { CATEGORY_LABELS, LISTING_TYPE_LABELS } from "./labels";

const LISTING_TYPES = Object.keys(LISTING_TYPE_LABELS) as ListingType[];
const CATEGORIES = Object.keys(CATEGORY_LABELS) as ListingCategory[];

type SavePinFormProps = {
  pin: Pin;
  onSaved: (listing: Listing) => void;
};

/** Names a dropped pin and saves it as a listing. The API has the final say on every field. */
export function SavePinForm({ pin, onSaved }: SavePinFormProps) {
  const [title, setTitle] = useState("");
  const [listingType, setListingType] = useState<ListingType>("LOST");
  const [category, setCategory] = useState<ListingCategory>("OTHER");
  const [floor, setFloor] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const trimmedFloor = floor.trim();
      const saved = await createListing({
        title,
        listingType,
        category,
        buildingId: pin.building?.id ?? null,
        floor: trimmedFloor ? Number(trimmedFloor) : null,
        latitude: pin.latitude,
        longitude: pin.longitude,
      });
      onSaved(saved);
    } catch (caught) {
      if (caught instanceof ApiError && caught.fieldErrors.length > 0) {
        setFieldErrors(Object.fromEntries(caught.fieldErrors.map(({ field, message }) => [field, message])));
      } else {
        setFormError(caught instanceof ApiError ? caught.message : "Something went wrong saving this pin.");
      }
      setSaving(false);
    }
  };

  const pinError = fieldErrors.buildingId ?? fieldErrors.latitude;

  return (
    <View testID="save-pin-form" style={styles.form}>
      <ScrollView style={styles.fields} contentContainerStyle={styles.fieldsContent} keyboardShouldPersistTaps="handled">
        <TextInput
          accessibilityLabel="What was lost or found"
          placeholder="What was lost or found?"
          placeholderTextColor="#55636F"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />
        {fieldErrors.title ? (
          <Text role="alert" style={styles.fieldError}>
            {fieldErrors.title}
          </Text>
        ) : null}

        <View accessibilityRole="radiogroup" accessibilityLabel="Lost or found" style={styles.choices}>
          {LISTING_TYPES.map((type) => (
            <Choice key={type} label={LISTING_TYPE_LABELS[type]} selected={type === listingType} onPress={() => setListingType(type)} />
          ))}
        </View>
        <View accessibilityRole="radiogroup" accessibilityLabel="Category" style={styles.choices}>
          {CATEGORIES.map((option) => (
            <Choice key={option} label={CATEGORY_LABELS[option]} selected={option === category} onPress={() => setCategory(option)} />
          ))}
        </View>

        <TextInput
          accessibilityLabel="Floor, if indoors"
          placeholder="Floor, if indoors"
          placeholderTextColor="#55636F"
          keyboardType="number-pad"
          value={floor}
          onChangeText={setFloor}
          style={styles.input}
        />
        {fieldErrors.floor ? (
          <Text role="alert" style={styles.fieldError}>
            {fieldErrors.floor}
          </Text>
        ) : null}
        {pinError ? (
          <Text role="alert" style={styles.fieldError}>
            {pinError}
          </Text>
        ) : null}
        {formError ? (
          <Text role="alert" style={styles.fieldError}>
            {formError}
          </Text>
        ) : null}
      </ScrollView>

      {/* Outside the scrolling area, so it's always on screen, even on a short phone. */}
      <Pressable accessibilityRole="button" disabled={saving} onPress={() => void save()} style={[styles.saveButton, saving && styles.saveButtonBusy]}>
        <Text style={styles.saveButtonText}>{saving ? "Saving…" : "Save pin"}</Text>
      </Pressable>
    </View>
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      aria-checked={selected}
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected]}
    >
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  form: { flex: 1, gap: 8, minHeight: 0 },
  fields: { flex: 1 },
  fieldsContent: { gap: 8 },
  input: { backgroundColor: "#FFFFFF", borderColor: "#6B7985", borderRadius: 8, borderWidth: 1, color: "#112E51", fontSize: 15, paddingHorizontal: 12, paddingVertical: 8 },
  fieldError: { color: "#8A0B20", fontSize: 13 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  choice: { borderColor: "#112E51", borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  choiceSelected: { backgroundColor: "#112E51" },
  choiceText: { color: "#112E51", fontSize: 13, fontWeight: "600" },
  choiceTextSelected: { color: "#FFFFFF" },
  saveButton: { alignItems: "center", backgroundColor: "#112E51", borderRadius: 8, paddingVertical: 10 },
  saveButtonBusy: { opacity: 0.6 },
  saveButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
