import Modal from "flarum/components/Modal";
import Button from "flarum/components/Button";
import ItemList from "flarum/utils/ItemList";
import Stream from "flarum/utils/Stream";
import Switch from "flarum/components/Switch";

export default class BlogPostSettingsModal extends Modal {
  oninit(vnode) {
    super.oninit(vnode);

    if (this.attrs.article) {
      this.meta =
        this.attrs.article && this.attrs.article.blogMeta()
          ? this.attrs.article.blogMeta()
          : app.store.createRecord("blogMeta");
    } else {
      this.meta = this.attrs.meta ? this.attrs.meta : app.store.createRecord("blogMeta");
    }

    this.isNew = !this.meta.exists;

    this.summary = Stream(this.meta.summary() || "");

    this.featuredImage = Stream(this.meta.featuredImage() || "");

    this.isFeatured = Stream(this.meta.isFeatured() || false);
    this.isSized = Stream(this.meta.isSized() || false);
    this.isPendingReview = Stream(this.meta.isPendingReview() || false);
    this.formUpload = this.formUpload.bind(this);
  }

  className() {
    return "Modal--small Support-Modal";
  }

  title() {
    return "Blog post settings";
  }

  success(response) {
    this.$("input").val("");

    this.isLoading = false;
    this.isSuccess = true;
    m.redraw();

    const link = response.data.link;

    console.log("link", link);

    this.featuredImage(link)


    // let stringToInject = this.buildEmbedCode(response.data.link, response.data.width > 1024);

    // this.attrs.editor.insertAtCursor(stringToInject);

    // After a bit, re-enable upload
    setTimeout(() => {
      console.log("featuredImage",this.featuredImage())
      this.isSuccess = false;
      m.redraw();
    }, 2000);
  }

  error(response) {
    this.isLoading = false;
    this.isError = true;
    m.redraw();

    // Output the error to the console, for debugging purposes
    console.error(response);

    alert("Error occured while uploading the image, please check your internet connection.")

    // After a bit, re-enable upload
    setTimeout(() => {
      this.isError = false;
      m.redraw();
    }, 2000);
  }

  formUpload(e) {
    const files = this.$("input").prop("files");

    if (files.length === 0) {
      return;
    }
    this.upload(files[0]);
  }

  upload(file) {
    this.isError = false;
    this.isLoading = true;
    m.redraw();

    const formData = new FormData();
    formData.append("image", file);

    $.ajax({
      url: "https://api.imgur.com/3/image",
      headers: {
        Authorization: "Client-ID " + app.forum.attribute("imgur-upload.client-id"),
      },
      type: "POST",
      data: formData,
      cache: false,
      contentType: false,
      processData: false,
      success: this.success.bind(this),
      error: this.error.bind(this),
    });
  }

  content() {
    return (
      <div className="Modal-body">
        <div className="Form">{this.fields().toArray()}</div>
      </div>
    );
  }

  fields() {
    const items = new ItemList();

    items.add(
      "summary",
      <div className="Form-group">
        <label>Article summary:</label>
        <textarea
          className="FormControl"
          style={{
            maxWidth: "100%",
            minWidth: "100%",
            width: "100%",
            minHeight: "120px",
          }}
          bidi={this.summary}
          placeholder={"Please enter a summary"}
        />

        <small>
          This summary will be visible on the blog overview page and will be used for SEO purposes.
        </small>
      </div>,
      30
    );

    items.add(
      "image",
      <div className="Form-group">
        <label>Article Image:</label>

        <input accept="image/*" type="file" className="FormControl" onchange={this.formUpload} />
        <input
          id="articleImageURl"
          type="text"
          className="d-none"
          bidi={this.featuredImage}
          placeholder={"https://"}
        />

        <small>Best image resolution for social media: 1200x630</small>

        {this.featuredImage() != "" && (
          <img
            src={this.featuredImage()}
            alt={"Article image"}
            title={"Blog post image"}
            width={"100%"}
            style={{ marginTop: "15px" }}
          />
        )}
      </div>,
      30
    );

    items.add(
      "sized",
      <div className="Form-group">
        {Switch.component(
          {
            state: this.isSized() == true,
            onchange: (val) => {
              this.isSized(val);
            },
          },
          [
            <b>Highlighted post</b>,
            <div className="helpText" style={{ fontWeight: 500 }}>
              Give this post a big image on the blog overview page.
            </div>,
          ]
        )}
      </div>,
      -10
    );

    items.add(
      "submit",
      <div className="Form-group">
        {Button.component(
          {
            type: "submit",
            className: "Button Button--primary SupportModal-save",
            loading: this.loading || this.isError || this.isLoading,
          },
          "Update"
        )}
      </div>,
      -10
    );

    return items;
  }

  submitData() {
    return {
      summary: this.summary(),
      featuredImage: this.featuredImage(),
      isFeatured: this.isFeatured(),
      isSized: this.isSized(),
      isPendingReview: this.isPendingReview(),
      relationships:
        this.isNew && !this.attrs.isComposer
          ? {
              discussion: this.attrs.article,
            }
          : null,
    };
  }

  onsubmit(e) {
    e.preventDefault();

    // Submit data
    if (this.attrs.onsubmit) {
      // Update attributes
      this.meta.pushData({
        attributes: this.submitData(),
      });

      // Push
      this.attrs.onsubmit(this.meta);

      this.hide();
      return;
    }

    this.loading = true;

    this.meta.save(this.submitData()).then(
      () => {
        if (this.attrs.article) {
          this.attrs.article.pushData({
            relationships: {
              blogMeta: this.meta,
            },
          });
        }

        this.hide();
        m.redraw();
      },
      (response) => {
        this.loading = false;
        this.handleErrors(response);
      }
    );
  }
}
