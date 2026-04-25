export const chunkText = (text, targetWordCount = 500, overlapWordCount = 100) => {
    if (!text || typeof text !== "string") return [];

    // 1. Normalize whitespace and split by paragraphs to preserve structure.
    const normalizedText = text
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    if (!normalizedText) return [];

    const paragraphs = normalizedText.split(/\n\s*\n/);
    const segments = [];

    for (const p of paragraphs) {
        const words = p.trim().split(/\s+/).length;
        if (words > targetWordCount * 0.8) {
            // If a paragraph is large, split sentence-aware but keep trailing text too.
            const sentences = p.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
            if (sentences) {
                segments.push(...sentences.map(s => s.trim()).filter(s => s));
            } else {
                segments.push(p.trim());
            }
        } else {
            segments.push(p.trim());
        }
    }

    const chunks = [];
    let currentChunk = [];
    let currentWordCount = 0;
    let index = 0;

    const filteredSegments = segments.filter(s => s.length > 0);

    for (let i = 0; i < filteredSegments.length; i++) {
        const segment = filteredSegments[i];
        const wordsInSegment = segment.split(/\s+/).length;

        if (currentWordCount + wordsInSegment > targetWordCount && currentChunk.length > 0) {
            chunks.push({
                content: currentChunk.join('\n\n').trim(),
                metadata: { chunkIndex: index }
            });
            index++;

            // Create overlap by backtracking
            let overlapCount = 0;
            let j = currentChunk.length - 1;
            const newChunk = [];

            while (j >= 0) {
                const wCount = currentChunk[j].split(/\s+/).length;
                if (overlapCount + wCount > overlapWordCount) {
                    if (overlapCount === 0) {
                        newChunk.unshift(currentChunk[j]);
                        overlapCount += wCount;
                    }
                    break;
                }
                newChunk.unshift(currentChunk[j]);
                overlapCount += wCount;
                j--;
            }

            currentChunk = [...newChunk, segment];
            currentWordCount = overlapCount + wordsInSegment;
        } else {
            currentChunk.push(segment);
            currentWordCount += wordsInSegment;
        }
    }

    // Push the remaining segments as the final chunk
    if (currentChunk.length > 0) {
        chunks.push({
            content: currentChunk.join('\n\n').trim(),
            metadata: { chunkIndex: index }
        });
    }

    return chunks;
};