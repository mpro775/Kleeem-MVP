// src/hooks/useCarousel.ts
import { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaOptionsType, EmblaCarouselType } from "embla-carousel";
import Autoplay, { type AutoplayOptionsType } from "embla-carousel-autoplay";

type UseCarouselOptions = {
  emblaOptions?: EmblaOptionsType;
  autoplayOptions?: AutoplayOptionsType;
};

export const useCarousel = (options: UseCarouselOptions = {}) => {
  const { emblaOptions, autoplayOptions } = options;

  const baseOptions: EmblaOptionsType = {
    direction: "rtl", // ✅ عربي
    align: "center",
    containScroll: "trimSnaps",
    slidesToScroll: 1,
    loop: true,
    ...emblaOptions,
  };

  const plugins = autoplayOptions ? [Autoplay(autoplayOptions)] : [];
  const [emblaRef, emblaApi] = useEmblaCarousel(baseOptions, plugins);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [scrollProgress, setScrollProgress] = useState(0);

  const onSelect = useCallback((api: EmblaCarouselType) => {
    setSelectedIndex(api.selectedScrollSnap());
  }, []);

  const onScroll = useCallback((api: EmblaCarouselType) => {
    setScrollProgress(api.scrollProgress());
  }, []);

  const scrollTo = useCallback(
    (i: number) => emblaApi?.scrollTo(i),
    [emblaApi]
  );
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    onSelect(emblaApi);

    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", () => {
      setScrollSnaps(emblaApi.scrollSnapList());
      onSelect(emblaApi);
    });
    emblaApi.on("scroll", onScroll);

    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
      emblaApi.off("scroll", onScroll);
    };
  }, [emblaApi, onSelect, onScroll]);

  return {
    emblaRef,
    emblaApi,
    scrollSnaps,
    selectedIndex,
    scrollProgress,
    scrollTo,
    scrollPrev,
    scrollNext,
  };
};
