package service

func (s *FrameIngestService) Publisher() FramePublisher {
	return s.publisher
}
