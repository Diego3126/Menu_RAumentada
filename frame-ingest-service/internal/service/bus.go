package service

func EncodeFrameForBus(frame IngestedFrame, topic string) ([]byte, error) {
	return encodeEnvelope(frame, topic)
}
