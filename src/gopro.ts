import fetch from "node-fetch";
import { resolveConfig } from "prettier";
import { URL } from "url";

export enum CaptureMode {
  VIDEO,
  PHOTO,
  BURST,
  TIMELAPSE,
  HDMI,
}

export enum Fov {
  WIDE,
  MEDIUM,
  NARROW,
}

export enum VideoMode {
  NTSC,
  PAL,
}

export interface GoProProperties {
  baseUrl?: string;
  password?: string;
  corsMode?: boolean;
}

export default class GoPro {
  baseUrl: string;
  password?: string;
  corsMode: boolean;

  public previewUrl = () => `${this.baseUrl}:8080/live/amba.m3u8`;

  /**
   *
   * @param {Object} kwargs - connection parameters
   * @param {string} kwargs.baseurl - The url of the gopro api, default schould alway be correct.
   * @param {string} kwargs.password - The password of the gopro. Should be the same as the wifi password. If no password is provided, we try to read it from the camera.
   * @param {boolean} kwargs.corsMode - Enable or disable cors mode, If corse mode is activated instead of specifiing the port 8080 to get media, /8080 will be added to the route. http://10.5.5.9:8080 => http://10.5.5.9/8080.
   */
  constructor(kwargs: GoProProperties = {}) {
    this.baseUrl = kwargs.baseUrl ? kwargs.baseUrl : "http://10.5.5.9";
    this.corsMode = kwargs.corsMode ? kwargs.corsMode : false;

    if (kwargs.password) {
      this.password = kwargs.password;
    }
  }

  private _readPassword = () =>
    this._bacpac("sd", "", false).then((res) =>
      res
        .text()
        .then(
          (text) =>
            (this.password = text.replace(/\s+/g, "").replace(/\0/g, ""))
        )
    );

  private _requestURL = (
    param1: string,
    param2: string,
    option: string = "",
    password: boolean = true
  ) => {
    const createUrl = (
      param1: string,
      param2: string,
      option: string = "",
      password: string = ""
    ) => {
      let url = `${this.baseUrl}/${param1}/${param2}`;
      if (option.length > 0 || password.length > 0) {
        url += "?";
      }
      if (password.length > 0) {
        url += `t=${password}`;
        if (option.length > 0) {
          url += "&";
        }
      }
      if (option.length > 0) {
        url += `p=%${option}`;
      }
      console.log(url);
      console.log(new URL(url));
      return new URL(url);
    };

    return new Promise<string | URL>((resolve, reject) => {
      if (password && this.password === undefined) {
        console.log("reading password");
        this._readPassword().then(() => {
          resolve(createUrl(param1, param2, option, this.password));
        });
      } else {
        resolve(createUrl(param1, param2, option, this.password));
      }
    });
  };

  private _call_api = (
    param1: string,
    param2: string,
    option: string = "",
    password: boolean = false
  ): Promise<any> =>
    new Promise((resolve, reject) => {
      this._requestURL(param1, param2, option, password).then((url) =>
        fetch(url)
          .then((res) => resolve(res))
          .catch((error) => reject(error))
      );
    });

  private _bacpac = (
    command: string,
    option: any = "",
    password: boolean = true
  ) => this._call_api("bacpac", command, option, password);

  private _camera = (
    command: string,
    option: any = "",
    password: boolean = true
  ) => this._call_api("camera", command, option, password);

  /**
   * Starts beeping
   */
  public startBeeping = () => this._camera("LL", "01");

  /**
   * Stops beeping
   */
  public stopBeeping = () => this._camera("LL", "00");

  /**
   * turns camera on when wifi is connected
   */
  public turnOn = () => this._bacpac("PW", "01");

  /**
   * turns camera off
   */
  public turnOff = () => this._bacpac("PW", "00");

  /**
   * delete the last image/video
   */
  public deleteLast = () => this._camera("DL");

  /**
   * delete all media
   */
  public deleteAll = () => this._camera("DA");

  /**
   * set orientation UP
   */
  public orientationUp = () => this._camera("UP", "00");

  /**
   * set orientation DOWN
   */
  public orientationDown = () => this._camera("UP", "01");

  /**
   * start preview and stream to http://10.5.5.9:8080/live/amba.m3u8
   */
  public startPreview = () => this._camera("PV", "02");

  /**
   * stop preview and preview streaming
   */
  public stopPreview = () => this._camera("PV", "02");

  /**
   * Set timelapse interval
   * @param {number} interval - The interval in seconds. Allowed values are 0.5, 1, 5, 10, 30, 60
   */
  public timelapseInterval = (interval: 0.5 | 1 | 5 | 10 | 30 | 60) => {
    switch (interval) {
      case 0.5: {
        return this._camera("TI", "00");
      }
      case 1: {
        return this._camera("TI", "01");
      }
      case 5: {
        return this._camera("TI", "05");
      }
      case 10: {
        return this._camera("TI", "0a");
      }
      case 30: {
        return this._camera("TI", "1e");
      }
      case 60: {
        return this._camera("TI", "3c");
      }
      default: {
        throw new RangeError(
          `Interval has to be specified in seconds and has to be one of 0.5, 1, 5, 10, 30, 60. Recieved ${interval}`
        );
      }
    }
  };

  /**
   * Set auto power off time in seconds.
   * @param {"NEVER" | 60 | 120 | 300} delay - The Delay for the auto power off.
   */
  public autoPowerOff = (delay: "NEVER" | 60 | 120 | 300) => {
    switch (delay) {
      case "NEVER": {
        return this._camera("AO", "00");
      }
      case 60: {
        return this._camera("AO", "01");
      }
      case 120: {
        return this._camera("AO", "02");
      }
      case 300: {
        return this._camera("AO", "03");
      }
    }
  };

  /**
   * set gopro's video mode
   * @param {VideoMode} mode - The gopro's video mode to choose.
   */
  public videoMode(mode: VideoMode) {
    switch (mode) {
      case VideoMode.NTSC: {
        return this._camera("VM", "00");
      }
      case VideoMode.PAL: {
        return this._camera("VM", "01");
      }
    }
  }

  /**
   * set the field of view
   * @param {Fov} fov - The desired field of view.
   */
  public fieldOfView = (fov: Fov) => {
    switch (fov) {
      case Fov.WIDE: {
        return this._camera("FV", "00");
      }
      case Fov.MEDIUM: {
        return this._camera("FV", "01");
      }
      case Fov.NARROW: {
        return this._camera("FV", "02");
      }
    }
  };

  /**
   * set camera capture mode
   * @param {CaptureMode} mode - the desired capture mode
   */
  public mode = (mode: CaptureMode) => {
    switch (mode) {
      case CaptureMode.VIDEO: {
        return this._camera("CM", "00");
      }
      case CaptureMode.TIMELAPSE: {
        return this._camera("CM", "03");
      }
      case CaptureMode.PHOTO: {
        return this._camera("CM", "01");
      }
      case CaptureMode.HDMI: {
        return this._camera("CM", "05");
      }
      case CaptureMode.BURST: {
        return this._camera("CM", "02");
      }
      default: {
        return this._camera("CM", "00");
      }
    }
  };

  /**
   * list media on gopro.
   * @returns {Promise<Array<string>>} - A list of links to all the images.
   */
  public listMedia = (): Promise<Array<string>> => {
    const _filesFrom = (
      baseDir: string,
      mediaItems: Array<any>
    ): Array<string> => {
      const files = new Array<string>();
      mediaItems.forEach((item) => {
        if (item.hasOwnProperty("d")) {
          _filesFrom(`${baseDir}/${item.d}`, item.fs).forEach((item) =>
            files.push(item)
          );
        } else {
          files.push(`${baseDir}/${item.n}`);
        }
      });
      return files;
    };

    const filesFromJson = (json: any): Array<string> => {
      return _filesFrom("", json.media);
    };

    let port = "";
    if (this.corsMode) {
      port += "/8080";
    } else {
      port += ":8080";
    }

    return new Promise((resolve, reject) =>
      fetch(`${this.baseUrl}${port}/gp/gpMediaList`)
        .then((response) => response.json())
        .then((json) =>
          resolve(
            filesFromJson(json.media).map(
              (file) => `${this.baseUrl}${port}/videos/DCIM/${file}`
            )
          )
        )
        .catch((error) => reject(error))
    );
  };

  shutter = () => {
    return this._camera("SH", "01");
  };

  stop = () => {
    return this._camera("SH", "00");
  };

  status = () => {
    return this._camera("sx");
  };
}
