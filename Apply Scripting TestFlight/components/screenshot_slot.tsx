import { Button, HStack, Image, Text, VStack } from "scripting"
import { copy } from "../constants/copy"

export type ScreenshotSlotProps = {
  title: string
  image: UIImage | null
  onPick: () => void
}

export function ScreenshotSlot(props: ScreenshotSlotProps) {
  return (
    <VStack alignment="leading" spacing={10}>
      <Button action={props.onPick}>
        <HStack>
          <Image
            systemName={props.image ? "checkmark.circle" : "plus.circle"}
            foregroundStyle={props.image ? "systemGreen" : "systemBlue"}
          />
          <VStack alignment="leading">
            <Text font="headline">{props.title}</Text>
            <Text foregroundStyle="secondaryLabel">{props.image ? copy.replace : copy.select}</Text>
          </VStack>
        </HStack>
      </Button>
      {props.image ? (
        <Image
          image={props.image}
          resizable
          aspectRatio={{ contentMode: "fit" }}
          frame={{ maxWidth: "infinity", maxHeight: 420 }}
          clipped
        />
      ) : null}
    </VStack>
  )
}
