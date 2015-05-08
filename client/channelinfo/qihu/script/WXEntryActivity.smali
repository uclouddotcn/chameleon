.class public L%package%/wxapi/WXEntryActivity;
.super Landroid/app/Activity;
.source "WXEntryActivity.java"


# direct methods
.method public constructor <init>()V
    .registers 1

    .prologue
    .line 14
    invoke-direct {p0}, Landroid/app/Activity;-><init>()V

    return-void
.end method


# virtual methods
.method public onCreate(Landroid/os/Bundle;)V
    .registers 5
    .param p1, "savedInstanceState"    # Landroid/os/Bundle;

    .prologue
    .line 17
    const/4 v1, 0x1

    invoke-virtual {p0, v1}, L%package%/wxapi/WXEntryActivity;->requestWindowFeature(I)Z

    .line 18
    const/4 v1, 0x2

    invoke-virtual {p0, v1}, L%package%/wxapi/WXEntryActivity;->requestWindowFeature(I)Z

    .line 19
    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V

    .line 20
    invoke-virtual {p0}, L%package%/wxapi/WXEntryActivity;->getIntent()Landroid/content/Intent;

    move-result-object v0

    .line 21
    .local v0, "intent":Landroid/content/Intent;
    const-string v1, "function_code"

    const/16 v2, 0x816

    invoke-virtual {v0, v1, v2}, Landroid/content/Intent;->putExtra(Ljava/lang/String;I)Landroid/content/Intent;

    .line 22
    const/4 v1, 0x0

    invoke-static {p0, v0, v1}, Lcom/qihoo/gamecenter/sdk/matrix/Matrix;->execute(Landroid/content/Context;Landroid/content/Intent;Lcom/qihoo/gamecenter/sdk/common/IDispatcherCallback;)V

    .line 23
    invoke-virtual {p0}, L%package%/wxapi/WXEntryActivity;->finish()V

    .line 24
    return-void
.end method