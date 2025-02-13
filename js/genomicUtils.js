function getLocus(dataset, state, width, height, bpPerPixel){

    // bp/bin = (bp/pixel) * (pixel/bin) = bp
    const bpPerBin = bpPerPixel * state.pixelSize

    // bp = bin * bp / bin = bp
    const xStartBP = 1 + Math.round(state.x * bpPerBin)
    const yStartBP = 1 + Math.round(state.y * bpPerBin)

    const chromosome1 = dataset.chromosomes[state.chr1]
    const chromosome2 = dataset.chromosomes[state.chr2]

    // bp = (pixel * bin/pixel) * (bp/bin)
    // bp = bin * bp/bin = bp
    const widthBP = Math.round(bpPerPixel * width)
    const heightBP = Math.round(bpPerPixel * height)

    // bp = bp
    const xEndBP = Math.min(chromosome1.size, widthBP + xStartBP - 1)
    const yEndBP = Math.min(chromosome2.size, heightBP + yStartBP - 1)

    return { xStartBP, yStartBP, xEndBP, yEndBP, chromosome1, chromosome2, pixelSize:state.pixelSize }

}

export { getLocus }
