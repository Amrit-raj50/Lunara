from PIL import Image, ImageDraw
import os

def round_corners(image_path, output_path, radius=None, circular=False):
    """
    Create rounded corners or circular mask for an image.
    
    Args:
        image_path: Path to input image
        output_path: Path to save output
        radius: Corner radius (if None, calculated as 20% of min dimension)
        circular: If True, makes image circular instead of rounded rectangle
    """
    # Open the image
    img = Image.open(image_path).convert("RGBA")
    width, height = img.size
    
    # Create a new image with transparency
    rounded_img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    
    # Create mask
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    
    if circular:
        # Make it circular - use the smaller dimension
        size = min(width, height)
        left = (width - size) // 2
        top = (height - size) // 2
        right = left + size
        bottom = top + size
        draw.ellipse([left, top, right, bottom], fill=255)
    else:
        # Rounded rectangle
        if radius is None:
            radius = min(width, height) // 5  # 20% of smaller dimension
        
        draw.rounded_rectangle([0, 0, width, height], radius=radius, fill=255)
    
    # Apply mask
    rounded_img.paste(img, (0, 0), mask)
    
    # Save
    rounded_img.save(output_path, "PNG")
    print(f"Saved rounded logo to: {output_path}")
    return output_path

if __name__ == "__main__":
    input_logo = "frontend/public/assets/logo.png"
    
    # Create rounded rectangle version
    round_corners(input_logo, "frontend/public/assets/logo_rounded.png", radius=80)
    
    # Create circular version
    round_corners(input_logo, "frontend/public/assets/logo_circular.png", circular=True)
    
    print("Done! Created two versions:")
    print("  - logo_rounded.png (rounded rectangle)")
    print("  - logo_circular.png (circular)")
