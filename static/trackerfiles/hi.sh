#!/bin/bash

# Fixed script using openmpt123 only
OUTPUT_DIR="converted_flac"
mkdir -p "$OUTPUT_DIR"

COUNT=0
FAILED=0

# Check if openmpt123 is available
if ! command -v openmpt123 &> /dev/null; then
    echo "Error: openmpt123 not found!"
    echo "Install it with:"
    echo "  Ubuntu/Debian: sudo apt install libopenmpt-tools"
    echo "  MacOS: brew install libopenmpt"
    echo "  Fedora: sudo dnf install libopenmpt"
    exit 1
fi

for file in *.mod *.xm *.it; do
    [ -e "$file" ] || continue
    
    base="${file%.*}"
    output="$OUTPUT_DIR/${base}.flac"
    
    echo "Converting: $file"
    
    # openmpt123's correct render syntax
    if openmpt123 --render "$file" --output-type flac -o "$output" 2>/dev/null; then
        echo "  ✓ Converted to: $output"
        ((COUNT++))
    else
        echo "  ✗ Failed: $file"
        ((FAILED++))
    fi
done

echo "Done: $COUNT converted, $FAILED failed"
echo "Files in: $OUTPUT_DIR"
