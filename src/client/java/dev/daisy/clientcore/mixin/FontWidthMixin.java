package dev.daisy.clientcore.mixin;

import dev.daisy.clientcore.ui.DaisyText;
import net.minecraft.client.gui.Font;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Measures a string the way it will be drawn while a HUD module has bold or small capitals
 * on (see DaisyText.withHudStyle). Bold letters are a pixel wider, so without this every
 * module would size its panel for plain text and the last letters would hang off the edge.
 */
@Mixin(Font.class)
public abstract class FontWidthMixin {
    @Inject(method = "width(Ljava/lang/String;)I", at = @At("HEAD"), cancellable = true, require = 0)
    private void clientcore$styledWidth(String text, CallbackInfoReturnable<Integer> cir) {
        if (text != null && DaisyText.hudActive()) cir.setReturnValue(DaisyText.hudWidth((Font) (Object) this, text));
    }
}
